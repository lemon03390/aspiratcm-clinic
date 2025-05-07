# 資料庫清理腳本

這個目錄包含用於維護和清理資料庫的工具腳本。

## cleanup_database.py

這個腳本用於清理資料庫，只保留與醫生（`doctors`）和預約（`appointments`）相關的表，刪除其他所有表格，包括：

- patients（病人資料）
- medical_records（病例記錄）
- diagnoses（診斷記錄）
- prescriptions（處方記錄）
- herb_items（中藥項目）
- treatments（治療記錄）
- treatment_items（治療項目）
- herbs（中藥資料）
- inventory（庫存資料）
- tcm_settings（中醫設定）
- reference_data（參考資料）
- 其他非核心表格

### 執行步驟

1. 確保 Docker 服務正在運行
2. 啟動 PostgreSQL 資料庫容器
3. 設置環境變數（可選）：
   ```bash
   export POSTGRES_USER=postgres
   export POSTGRES_PASSWORD=postgres
   export POSTGRES_HOST=localhost
   export POSTGRES_PORT=5432
   export POSTGRES_DB=clinic
   ```
4. 執行清理腳本：
   ```bash
   cd backend
   python scripts/cleanup_database.py
   ```
5. 腳本會顯示將刪除哪些表格，並要求確認
6. 輸入 `y` 確認刪除操作

### 注意事項

- 此操作不可逆，請確保在執行前已備份重要數據
- 預設會保留以下表格：
  - `doctors`（醫生資料）
  - `appointments`（預約資料）
  - `alembic_version`（版本控制）
- 如果需要調整保留的表格，請修改腳本中的 `TABLES_TO_KEEP` 列表

## check_database_structure.py

這個腳本用於檢查資料庫結構，確保關鍵的表格和欄位都存在，特別是在清理資料庫後，確保系統仍能正常運行。

### 功能特點

- 檢查 `doctors` 和 `appointments` 表是否存在
- 檢查這些表中是否有所有必要的欄位
- 可以自動添加缺失的欄位（如果需要）
- 重點確保 `referral_source` 和 `referral_notes` 等新欄位存在

### 執行步驟

1. 確保資料庫連接可用
2. 執行檢查腳本：
   ```bash
   cd backend
   python scripts/check_database_structure.py
   ```
3. 如果發現缺失的表格或欄位，腳本會提示是否要修復
4. 輸入 `y` 確認修復操作

## reset_alembic_version.py

這個腳本用於清理資料庫後重置 `alembic_version` 表中的版本號，確保 Alembic 遷移狀態與實際資料庫結構一致。

### 功能特點

- 顯示當前 alembic_version 表中的版本號
- 可以更新版本號為指定的值
- 確保 Alembic 與資料庫實際結構同步

### 執行步驟

1. 查看當前版本：
   ```bash
   cd backend
   python scripts/reset_alembic_version.py
   ```

2. 設置新版本：
   ```bash
   python scripts/reset_alembic_version.py --version=新版本ID
   ```

## create_sync_migration.py

這個腳本用於清理資料庫後創建一個同步遷移文件，記錄資料庫結構變更，並確保後續的 Alembic 操作不會嘗試恢復已刪除的表格。

### 功能特點

- 創建新的 Alembic 遷移文件
- 記錄已完成的資料庫清理操作
- 設置正確的遷移關聯，避免後續 autogenerate 混亂
- 確保重要欄位（如 referral_source, referral_notes）存在

### 執行步驟

1. 創建同步遷移文件（可選指定父版本）：
   ```bash
   cd backend
   python scripts/create_sync_migration.py
   ```
   或
   ```bash
   python scripts/create_sync_migration.py --parent=上一個版本ID
   ```

2. 腳本會自動生成新的遷移文件，並提示執行後續步驟

### 使用 Docker 環境

如果使用 Docker 環境，可以直接在容器內執行腳本：

```bash
docker-compose exec backend python scripts/check_database_structure.py
```

## 完整的清理和同步流程

在清理資料庫時，建議按照以下順序操作，確保資料庫結構和 Alembic 狀態保持一致：

1. **備份** - 先備份現有資料庫（如果有重要數據）
   ```bash
   pg_dump -U postgres -h localhost -d clinic > clinic_backup.sql
   ```

2. **清理資料庫** - 執行清理腳本，只保留核心表格
   ```bash
   python scripts/cleanup_database.py
   ```

3. **創建同步遷移** - 生成表示當前資料庫狀態的遷移文件
   ```bash
   python scripts/create_sync_migration.py
   ```
   腳本會顯示生成的遷移ID

4. **更新 Alembic 狀態** - 使用剛生成的遷移ID更新 alembic_version
   ```bash
   python scripts/reset_alembic_version.py --version=剛生成的ID
   ```

5. **檢查結構** - 確保資料庫結構完整
   ```bash
   python scripts/check_database_structure.py
   ```

6. **重啟服務** - 確保系統正常運行
   ```bash
   docker-compose restart
   ```

按照以上步驟操作後，資料庫將只保留需要的表格，且 Alembic 狀態會與實際結構同步，避免後續執行 `alembic upgrade` 或 `autogenerate` 時出現混亂。

## 修復資料 (可選)

如果清理後有任何資料不一致的問題，可以使用生成的同步遷移文件重新應用：

```bash
alembic upgrade head
```

或者使用檢查腳本自動修復：

```bash
python scripts/check_database_structure.py
``` 