# 本地開發環境設置指南

本文檔提供中醫診所管理系統的詳細本地開發環境設置步驟。

## 前置條件

在開始開發之前，請確保安裝以下工具：

1. **Docker** - 20.10.0 或更高版本
2. **Docker Compose** - 2.0.0 或更高版本
3. **Git** - 用於版本控制

## 開發環境設置步驟

### 1. 複製專案代碼庫

```bash
git clone <專案儲存庫URL>
cd <專案目錄>
```

### 2. 配置環境變數

在專案根目錄複製`.env.example`為`.env`並更新必要的設置：

```bash
cp .env.example .env
# 編輯.env文件，填入您的配置
```

重要的環境變數包括：

| 變數名 | 描述 | 範例值 |
|--------|------|--------|
| POSTGRES_USER | 資料庫用戶名 | clinic_admin |
| POSTGRES_PASSWORD | 資料庫密碼 | your_secure_password |
| POSTGRES_DB | 資料庫名稱 | clinic_db |
| SECRET_KEY | 用於JWT加密的密鑰 | your_secret_key_here |
| API_PORT | 後端API端口 | 8000 |
| FRONTEND_PORT | 前端應用端口 | 3000 |

### 3. 啟動開發服務

使用Docker Compose啟動整個應用堆棧：

```bash
# 構建並啟動所有服務
docker-compose up -d

# 只啟動特定服務
docker-compose up -d postgres backend
docker-compose up -d frontend
```

### 4. 初始化資料庫

首次設置時需初始化資料庫：

```bash
# 進入後端容器
docker exec -it aspira_backend bash

# 運行遷移腳本
cd /app
python -m alembic upgrade head

# 可選：載入初始測試數據
python -m app.utils.seed_data
```

### 5. 訪問應用服務

啟動服務後，可通過以下URL訪問：

- **前端應用**: http://localhost:3000
- **後端API**: http://localhost:8000
- **API文檔**: http://localhost:8000/docs (Swagger UI)
- **管理員介面**: http://localhost:3000/admin (需登錄管理員帳號)

### 6. 容器操作指令

常用的Docker操作命令：

```bash
# 查看所有運行中的容器
docker ps

# 查看容器日誌
docker-compose logs -f backend
docker-compose logs -f frontend

# 進入容器內部
docker exec -it aspira_backend bash
docker exec -it aspira_frontend sh

# 重啟特定服務
docker-compose restart backend

# 停止所有服務
docker-compose down
```

### 7. 資料庫連接

可以使用資料庫客戶端工具(如PgAdmin, DBeaver等)連接PostgreSQL資料庫：

- **主機**: localhost
- **端口**: 5432 (或您在.env中設置的POSTGRES_PORT)
- **用戶名**: POSTGRES_USER的值
- **密碼**: POSTGRES_PASSWORD的值
- **資料庫名**: POSTGRES_DB的值

## 常見問題排解

### 端口衝突

如果遇到端口已被占用的錯誤，可以修改`.env`文件中的端口配置。

### 資料庫連接失敗

確認Docker容器是否正常運行，PostgreSQL服務是否啟動：

```bash
docker ps | grep postgres
```

### 權限問題

如在Linux系統遇到權限問題，可能需要調整目錄權限或使用sudo。

## 開發工作流程

1. 從主分支創建新的功能分支
2. 實現功能並進行測試
3. 提交變更並創建合併請求
4. 代碼審核通過後合併到主分支

## 其他資源

- [FastAPI文檔](https://fastapi.tiangolo.com/)
- [Next.js文檔](https://nextjs.org/docs)
- [PostgreSQL文檔](https://www.postgresql.org/docs/)
- [Docker文檔](https://docs.docker.com/) 