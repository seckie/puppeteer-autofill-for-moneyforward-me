# puppeteer-autofill-for-moneyforward-me

CSV データを MoneyForward ME に自動で入力させたスクリプト。

## 背景

[2024 年 5 月から MoneyTree の無料アカウントでのデータ閲覧が一年間に制限されることになった](https://help.getmoneytree.com/ja/articles/9087796-%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E5%86%85%E5%AE%B9%E3%81%AE-%E9%83%A8%E5%A4%89%E6%9B%B4-%E9%96%B2%E8%A6%A7%E6%9C%9F%E9%96%93%E3%81%AE%E5%A4%89%E6%9B%B4-%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6%E3%81%AE%E3%81%8A%E7%9F%A5%E3%82%89%E3%81%9B) ため。
MoneyTree を利用するのはやめ、 すでに有料プランを契約している MoneyForward ME にデータを移行することにした。

MoneyTree の有料プランを一時的に契約し、全レコードの CSV データを出力。これを移行データとして利用した。
