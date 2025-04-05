# 專案目錄結構

本文檔描述中醫診所管理系統的目錄架構和各模組職責。

## 根目錄結構

```
clinic-management-system/
├── .env                   # 環境變數配置
├── .env.example           # 環境變數範例
├── docker-compose.yml     # Docker 容器編排配置
├── Dockerfile             # 主應用 Docker 映像建構檔
├── ecosystem.config.js    # PM2 進程管理配置
├── README.md              # 專案說明文檔
├── backend/               # 後端應用程式
├── frontend/              # 前端應用程式
└── docs/                  # 專案文檔目錄
```

## 後端架構 (FastAPI)

```
backend/
├── app/                   # 主應用程式目錄
│   ├── __init__.py        # 應用程式初始化
│   ├── main.py            # 主程式進入點
│   ├── run.py             # 應用程式執行器
│   ├── api/               # API 路由與控制器
│   ├── core/              # 核心配置與功能
│   │   ├── __init__.py
│   │   ├── config.py      # 系統配置
│   │   └── init_db.py     # 資料庫初始化
│   ├── db/                # 資料庫相關組件
│   │   └── database.py    # 資料庫連接管理
│   ├── models/            # 資料模型定義
│   ├── routes/            # API 路由定義
│   └── utils/             # 工具函數集合
│       ├── __init__.py
│       ├── query_data.py  # 資料查詢工具
│       └── query_phone.py # 電話查詢工具
├── migrations/            # Alembic 資料庫遷移
├── requirements.txt       # Python 依賴套件
└── alembic.ini            # Alembic 配置
```

## 前端架構 (Next.js)

```
frontend/
├── src/                   # 源代碼目錄
│   ├── app/               # Next.js App Router
│   │   ├── page.tsx       # 首頁
│   │   ├── layout.tsx     # 應用程式佈局
│   │   └── api/           # 前端 API 路由
│   ├── components/        # 可重用 React 組件
│   └── constants/         # 常量定義
├── public/                # 靜態資源目錄
├── package.json           # Node.js 依賴配置
├── tailwind.config.js     # Tailwind CSS 配置
├── next.config.js         # Next.js 配置
└── tsconfig.json          # TypeScript 配置
```

## 文檔目錄

```
docs/
├── setup_local_dev.md     # 本地開發環境設置
└── structure.md           # 專案結構說明
```

## 主要模組職責

### 後端模組

| 模組 | 職責描述 |
|------|----------|
| app/api | 提供 RESTful API 端點，接收和處理客戶端請求 |
| app/core | 包含系統核心配置、資料庫初始化等基礎功能 |
| app/db | 負責資料庫連接與會話管理 |
| app/models | 定義資料模型與資料庫表結構 |
| app/routes | 處理 HTTP 路由和請求分發 |
| app/utils | 提供各種輔助工具函數和查詢工具 |
| migrations | 管理資料庫結構變更和遷移 |

### 前端模組

| 模組 | 職責描述 |
|------|----------|
| src/app | 應用頁面與路由，基於 Next.js App Router |
| src/components | 可重用的 UI 組件，如表單、按鈕、導航等 |
| src/constants | 定義系統常量、選項和配置值 |
| public | 存放靜態資源，如圖片、圖標和靜態文件 |

## 技術分層架構

系統採用典型的三層架構：

1. **表示層** - 前端 Next.js 應用
2. **業務邏輯層** - 後端 FastAPI 服務
3. **資料存取層** - PostgreSQL 資料庫

## 開發與擴展

- 添加新功能時，請按照既有模組化結構擴展
- 所有模型變更需通過 Alembic 遷移腳本處理
- 前端組件應遵循可重用和可組合原則
- API 需遵循 RESTful 設計原則 