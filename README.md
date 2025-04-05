# 中醫診所管理系統 (Traditional Chinese Medicine Clinic Management System)

這是一個全功能的中醫診所管理系統，使用現代化技術棧構建，提供預約管理、患者資料、醫師班表等功能。

## 專案技術棧

- **前端**: Next.js (React框架)
- **後端**: FastAPI (Python框架) 
- **資料庫**: PostgreSQL
- **容器化**: Docker 與 Docker Compose
- **進程管理**: PM2

## 系統特性

- 患者預約管理
- 醫師排班系統
- 診斷記錄與病歷管理
- 多語言支持(繁體中文)
- 響應式設計，適配各種設備

## 本地開發設置

### 環境要求

- Docker 與 Docker Compose
- 專案根目錄下的`.env`檔案 (請參考`.env.example`建立)

### 環境變數說明

專案使用`.env`檔案管理環境變數，主要包含：

```
# PostgreSQL 設定
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=clinic_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# API 設定
API_HOST=0.0.0.0
API_PORT=8000

# 前端設定
FRONTEND_PORT=3000

# 安全設定
SECRET_KEY=your_secret_key
```

### 啟動開發環境

```bash
# 啟動所有服務 (前端、後端、資料庫)
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止所有服務
docker-compose down
```

服務啟動後，可通過以下地址訪問：
- 前端：http://localhost:3000
- 後端API：http://localhost:8000
- API文檔：http://localhost:8000/docs

## 部署注意事項

- 系統設計為在AWS EC2上使用Docker容器部署
- 使用Amazon Linux 2023 (AMI: al2023-ami-2023.6.20250303.0-kernel-6.1-x86_64)
- 採用預構建Docker映像部署，不依賴主機系統OS套件
- 詳細部署步驟請參考`docs/deployment.md`

## 開發文檔

- [本地開發設置](docs/setup_local_dev.md)
- [專案架構](docs/structure.md)
- [API文檔](http://localhost:8000/docs) (服務啟動後可訪問)

## 授權信息

本專案為私有系統，僅限授權使用。 