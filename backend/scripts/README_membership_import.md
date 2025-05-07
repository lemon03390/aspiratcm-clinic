# 會員資料導入說明

本文檔說明如何將從舊系統導出的會員資料導入到新的 PostgreSQL 數據庫中。

## 資料檔案

需要導入的 CSV 檔案：

1. `memberships.csv` — 包含會員基本資料（姓名、電話、生日等）
2. `membership_account_balances.csv` — 會員儲值餘額記錄
3. `membership_account_logs.csv` — 會員儲值和消費記錄

這些檔案應放置在 `frontend/public/data` 目錄下。

## 前置準備

1. 確保已執行 Alembic migration 創建必要的資料表：

```bash
cd backend
# 生成 migration 檔案（如果尚未生成）
alembic revision --autogenerate -m "add_membership_account_system"
# 執行 migration
alembic upgrade head
```

## 方法一：使用 Python 腳本

Python 腳本提供更靈活的導入方式，能夠處理數據轉換和錯誤處理。

```bash
cd backend
# 激活虛擬環境（如有需要）
source .venv/bin/activate
# 執行導入腳本
python -m scripts.import_membership_data
```

此腳本會：
- 導入會員基本資料
- 導入會員餘額資料
- 導入會員帳戶變動記錄
- 處理 ID 映射關係，保持引用完整性
- 提供詳細的日誌記錄

## 方法二：使用 SQL COPY 命令

SQL 方法通過 PostgreSQL 的 COPY 命令直接批量導入數據，速度更快，但靈活性較低。

1. 將 CSV 檔案複製到 PostgreSQL 伺服器可訪問的目錄（例如 `/tmp/csv_import/`）：

```bash
mkdir -p /tmp/csv_import
cp frontend/public/data/memberships.csv /tmp/csv_import/
cp frontend/public/data/membership_account_balances.csv /tmp/csv_import/
cp frontend/public/data/membership_account_logs.csv /tmp/csv_import/
```

2. 調整 SQL 腳本中的路徑：

編輯 `backend/scripts/import_membership_data.sql` 檔案，確保 `csv_directory` 變數指向正確路徑。

3. 執行 SQL 腳本：

```bash
# 假設資料庫名稱為 clinic，使用者名稱為 postgres
psql -U postgres -d clinic -f backend/scripts/import_membership_data.sql
```

## 注意事項

- 導入前先備份當前數據庫以防萬一
- 導入過程中可能需要處理重複鍵和外鍵約束的問題
- 確保 CSV 文件格式正確，字段對應正確
- 對於大量數據，使用 SQL COPY 方法可能更高效

## 故障排查

如遇到導入錯誤：

1. 檢查 CSV 檔案編碼（應為 UTF-8）
2. 確認 CSV 檔案格式是否符合預期
3. 查看 Python 腳本日誌或 PostgreSQL 日誌以獲取詳細錯誤信息
4. 對於 SQL 方法，可能需要調整 COPY 命令中的選項以匹配 CSV 格式 