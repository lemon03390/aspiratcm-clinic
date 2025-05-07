-- 會員資料導入 SQL 腳本
-- 使用 PostgreSQL COPY 命令從 CSV 文件直接導入資料

-- 注意：執行前請確保已執行 Alembic 的 migration，以創建必要的表格
-- 前置條件：CSV 檔案應放在 PostgreSQL 伺服器可訪問的路徑下
-- 使用方法：psql -U username -d database_name -f import_membership_data.sql

-- 設置路徑變數（根據實際情況調整）
\set csv_directory '\''/tmp/csv_import/\''

-- 開始事務
BEGIN;

-- 清空目標表格（可選）
-- TRUNCATE TABLE membership_account_logs;
-- TRUNCATE TABLE membership_account_balances;
-- TRUNCATE TABLE memberships;

-- 1. 導入會員資料
COPY memberships (id, patient_id, "phoneNumber", "contactAddress", "patientName", hkid, "termsConsent", "haveCard", created_at, updated_at)
FROM :'csv_directory' || 'memberships.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');

-- 重置序列（確保自增 ID 正確）
SELECT setval('memberships_id_seq', (SELECT MAX(id) FROM memberships));

-- 2. 導入會員餘額資料
COPY membership_account_balances (id, membership_id, "storedValue", "giftedValue", created_at, updated_at)
FROM :'csv_directory' || 'membership_account_balances.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');

-- 重置序列
SELECT setval('membership_account_balances_id_seq', (SELECT MAX(id) FROM membership_account_balances));

-- 3. 導入會員帳戶變動記錄
-- 注意：需根據實際 CSV 結構調整欄位
COPY membership_account_logs (id, membership_id, amount, "giftAmount", type, description, created_at, updated_at)
FROM :'csv_directory' || 'membership_account_logs.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');

-- 重置序列
SELECT setval('membership_account_logs_id_seq', (SELECT MAX(id) FROM membership_account_logs));

-- 提交事務
COMMIT;

-- 打印導入的資料數量
SELECT 'Memberships: ' || COUNT(*) FROM memberships;
SELECT 'Account Balances: ' || COUNT(*) FROM membership_account_balances;
SELECT 'Account Logs: ' || COUNT(*) FROM membership_account_logs; 