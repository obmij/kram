# PMM 部署與權限設定

## 必要 Script Properties

在 Apps Script 專案的「專案設定 → 指令碼屬性」設定：

- `SPREADSHEET_ID`：PMM 使用的 Google Sheets ID
- `ADMIN_EMAILS`：允許操作後台的 Google 帳號，以逗號分隔

範例：

```text
ADMIN_EMAILS=owner@example.com,manager@example.com
```

也可在 Apps Script 編輯器執行：

```javascript
configureAdminEmails([
  'owner@example.com',
  'manager@example.com'
]);
```

此函式會自動保留 Apps Script 專案擁有者帳號，避免管理員將自己鎖在系統外。

## 初次部署

1. 複製 `.clasp.json.example` 為 `.clasp.json`
2. 填入 Apps Script Project ID
3. 執行 `clasp push`
4. 在 Apps Script 執行 `setupSystem()`
5. 設定 `ADMIN_EMAILS`
6. 執行 `runSystemSelfCheck()`
7. 部署為 Web App

Web App 應以「存取應用程式的使用者」身分執行，並要求使用者登入 Google 帳號。

## 權限模型

受保護的操作包括：

- 新增會員
- 查詢單一會員
- 建立訂單
- 確認付款與時數加值
- 完成課程

每次操作都透過 `Session.getActiveUser()` 取得登入帳號，並與 `ADMIN_EMAILS` 白名單比對。

## 更新既有部署

修改程式後須建立新的 Web App deployment version，否則既有部署不會自動採用最新程式碼。
