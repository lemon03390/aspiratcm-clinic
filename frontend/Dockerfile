# 使用 Node 20 LTS 的穩定版本
FROM node:20-bullseye

# 設定工作目錄
WORKDIR /app

# ⬇️ 設定 ARG（build-time）與 ENV（build 和 run 都能讀）
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

# 複製 package.json 和 lock 檔案
COPY frontend/package*.json ./

# 安裝依賴
RUN npm install --unsafe-perm

# ✅ 複製環境變數檔（一定要存在於 Git 或手動上傳）
COPY frontend/.env.production .env.production

# 複製整個前端應用
COPY frontend/ ./

# 確保所有依賴都正確安裝
RUN npm install --unsafe-perm

# ✅ 印出實際環境變數值（debug）
RUN cat .env.production

# 執行編譯（嘗試最多 3 次，確保成功）
RUN npm run build || (npm install --unsafe-perm && npm run build) || (npm ci && npm run build)

# 暴露 Next.js port（預設為 3000）
EXPOSE 3000

# 啟動應用
CMD ["npm", "start"]
