# PMM 會員前台部署

## 已加入的功能

- 公開官網與置中的 PMM logo
- 正體中文、英文、日文切換
- 課程、PT、近期活動、預約、訂購時數、PMM 六個入口
- 新會員自行註冊與會員登入
- 會員剩餘時數、近期訂單與近期預約
- 預約時由伺服器再次檢查教練時段與會員時數
- 時數不足時回覆「你以為上課不用錢嗎？」
- Visa、Master、AE、Apple Pay、Google Pay、Line Pay、現場現金
- 現場現金由伺服器加收 50% 洗錢服務費
- 原管理後台保留於 `?mode=admin`

## 首次更新資料表

在 Apps Script 編輯器中，以管理員身份執行一次：

```javascript
setupSystem();
```

這會在既有工作表追加會員登入欄位、訂單服務費欄位、PT 公開簡介欄位，並加入 `PROMO10` 與兩位瑜伽導師。既有資料不會被刪除。

## 兩種部署

Apps Script 的公開會員前台必須以「部署者」身份執行，匿名訪客才可透過程式存取既有試算表。管理後台則應保留原本「存取者」身份執行的部署，以便沿用 Google 帳號管理員白名單。

建議建立兩個 deployment：

1. **Public Portal**：execute as deploying user，access anyone。預設網址開啟會員官網。
2. **Admin Console**：execute as user accessing，限需要登入的人員。網址加上 `?mode=admin`。

兩個 deployment 指向同一份程式與同一個 `SPREADSHEET_ID`。

## 上線前檢查

1. 執行 `setupSystem()`。
2. 執行 `runSystemSelfCheck()`。
3. 以新 Email 註冊會員。
4. 建立一筆 `PROMO10` 訂單，確認金額為 NTD 12,000。
5. 選擇現場現金，確認金額為 NTD 18,000。
6. 用 0 小時會員送出預約，確認顯示指定文案且沒有新增 Booking。
7. 由後台確認訂單付款，確認 Hour Ledger 與會員餘額同步更新。

## 支付範圍

目前付款選項會建立 Pending 訂單並計算金額；尚未串接各支付服務商的實際扣款 API。正式收款需要另外設定金流商、merchant credentials、callback 與付款結果簽章驗證。

## LINE OA 圖檔

`assets/pmm-line-rich-menu.svg` 是 2500 × 1686 的六格 rich menu 原始圖。上傳 LINE OA 前匯出為 PNG，並依六格順序設定對應網址。
