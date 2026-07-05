# PMM 私人教練管理系統

PMM 是以 Google Apps Script Web App、Google Sheets 與 Google Calendar 為核心的私人教練營運管理系統。

## 核心模組

- CRM：會員建檔、會員等級、交易與時數管理
- Orders：產品訂購、付款狀態與時數加值
- Bookings：教練可用時段、預約與時數扣除
- Dashboard：會員、營收、課程與低時數提醒

## 技術架構

- Frontend: Apps Script HTML Service + HTML/CSS/JavaScript
- Backend: Google Apps Script
- Database: Google Sheets
- Scheduling: Google Calendar / Bookings Sheet
- Repository: GitHub + clasp
- Timezone: Asia/Taipei

## 資料表

- `CRM_Members`
- `Orders`
- `Bookings`
- `Products`
- `Coaches`
- `Hour_Ledger`

`Hour_Ledger` 是時數異動的不可變更帳本，用於付款加值、預約扣除、取消退回及人工調整，避免僅修改 CRM 餘額而失去稽核紀錄。

## 開發原則

1. 訂單與預約寫入必須使用 LockService，避免重複流水號或超賣時段。
2. 付款加值與預約扣時數必須具備 idempotency 防重複機制。
3. 金額以整數 NTD 儲存；日期時間統一使用 Asia/Taipei。
4. 前端送出後，後端必須再次驗證會員餘額及教練時段。
5. 正式部署前需設定 Apps Script Properties，不在 repo 儲存金鑰或 Spreadsheet ID。

## 初始產品

| ID | 產品 | 時數 | 金額 |
|---|---|---:|---:|
| A | 私人教練一對一 12 小時 | 12 | NTD 16,000 |
| B | 私人教練一對一 25 小時 | 25 | NTD 32,000 |
| C | 私人教練一對一 5 小時 | 5 | NTD 8,888 |

## 初始教練

Apple、Berry、Cindy、Doofy、Fancy

## 專案狀態

目前進入 MVP 基礎架構階段。下一階段將加入 Sheet 初始化程式、CRM API、訂單交易、時數帳本與選課鎖定流程。
