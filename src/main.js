import fs from 'node:fs';
import { finished } from 'stream/promises';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import puppeteer from 'puppeteer';
import categoriesJson from '../data/categories.json' with { type: 'json' };
import accountsJson from '../data/accounts.json' with { type: 'json' };

const username = process.env.MF_USERNAME;
const password = process.env.MF_PASSWORD;
const csvReadFilename = process.env.CSV_READ_FILENAME;
const csvWriteFilename = process.env.CSV_WRITE_FILENAME;

// Read CSV
// @see https://csv.js.org/parse/examples/promises/
const processFile = async () => {
    const records = [];
    const parser = fs.createReadStream(csvReadFilename)
        .pipe(parse({
            columns: true,
            skip_empty_lines: true,
        }));
    parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
            records.push(record);
        }
    });
    await finished(parser);
    return records;
};

// Write CSV
const outputCSV = (records) => {
    return new Promise((resolve, reject) => {
        const columns = [ '完了','日付','金額','口座通貨','ご利用先・摘要','メモ','領収書','カテゴリ','口座名','口座番号','経費' ];
        stringify(records, {
            columns,
            header: true,
        }, (err, output) => {
            if (err) {
                reject(err);
            } else {
                resolve(output);
            }
        });
    });
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const mapAccountNameToValue = (accountName) => {
    const ac = accountsJson.find((account) => account.title === accountName);
    return ac ? ac.value : '';
};

const mapCategoryNameToId = (categoryName) => {
    const cat = categoriesJson.find((category) => category.title === categoryName);
    return cat ? cat.value : null;
};

(async () => {
    // Read CSV
    const records = await processFile();

    const browser = await puppeteer.launch({
        channel: 'chrome',
        args: ['--incognito'],
        headless: false,
    });

    // MoneyForward login
    const page = await browser.newPage();
    await page.goto("https://moneyforward.com/cf");
    await page.setViewport({ width: 1280, height: 1024 });
    await page.locator('[name="mfid_user[email]"]').fill(username);
    await Promise.all([
        page.waitForNavigation({ waitUntil: ['load', 'networkidle2' ]}),
        page.locator('#submitto').click(),
    ]);
    await page.locator('[name="mfid_user[password]"]').fill(password);
    await Promise.all([
        page.waitForNavigation({ waitUntil: ['load', 'networkidle2' ]}),
        page.locator('#submitto').click(),
    ]);

    for (let i = 0, l = records.length; i<l; i++) {
        const record = records[i];
        record['完了'] = 'FALSE';
        try {
            // Modal
            await page.locator('[data-toggle="modal"]').click();
            await sleep(2000);

            // Date
            const date = record['日付'];
            await page.locator('[name="user_asset_act[updated_at]"]').fill(date);
            await page.$eval('[name="user_asset_act[updated_at]"]', (el) => el.value = '');
            const dateInput = await page.waitForSelector('[name="user_asset_act[updated_at]"]');
            // await dateInput.click({ clickCount: 3 });
            dateInput.focus();
            await dateInput.type(date);

            // Price
            const price = parseInt(record['金額'], 10);
            if (price > 0) {
                throw new Error('Price is not negative');
            }
            await page.locator('[name="user_asset_act[amount]"]').fill(Math.abs(price).toString());

            // Payment source
            const account = mapAccountNameToValue(record['口座名']);
            const $accountSelect = await page.$('#sub_account-wrp>select');
            await $accountSelect.select(account);

            // Categories
            const category = mapCategoryNameToId(record['カテゴリ']);
            // Large category
            console.info('Date:', date, ' Price:', price, ' Category L:', category.l,  ' Category M:', category.m);
            await page.evaluate((category) => {
                document.querySelector('[name="user_asset_act[large_category_id]"]').value = category;
                return category;
            }, category.l);
            // Middle category
            await page.evaluate((category) => {
                document.querySelector('[name="user_asset_act[middle_category_id]"]').value = category;
                return category;
            }, category.m);
            // Small category
            const smallCategory = record['メモ'];
            await page.locator('#js-content-field').fill(smallCategory);
            
            // Submit
            await page.locator('#submit-button').click();

            record['完了'] = 'TRUE';

            // Next
            await page.locator('#confirmation-button').click();

        } catch (err) {
            console.error(typeof err === 'object' ? err.message : err);
        }
        records[i] = record;
        try {
            const csv = await outputCSV(records);
            fs.writeFileSync(csvWriteFilename, csv, { encoding: 'utf-8' });
        } catch (err) {
            console.error(typeof err === 'object' ? err.message : err);
            break;
        }
    }

    await sleep(5000);
    await browser.close();
})();
