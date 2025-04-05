FROM node:20-bullseye

# 設定工作資料夾
WORKDIR /app/frontend

# 複製必要檔案先（讓 npm install 可快取）
COPY frontend/package*.json ./

# ✅ 安裝依賴並避免權限問題
RUN npm install --unsafe-perm

# 複製全部 frontend 資料夾內容
COPY frontend/ .

# 設定 production mode 並 build
ENV NODE_ENV=production
RUN npm run build

# 啟動
CMD ["npm", "start"]
