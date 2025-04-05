FROM node:20-bullseye

RUN apt-get update && apt-get install -y \
  python3 \
  python3-pip \
  postgresql-client

WORKDIR /app

# 先複製全部專案內容
COPY . .

# 切換到前端資料夾
WORKDIR /app/frontend

# 👇 再複製 env 進來，這樣就不會被 COPY . . 蓋掉！
COPY .env.docker .env.production

# 安裝前端依賴
RUN npm install

# 設定為 production 並建構
ENV NODE_ENV=production
RUN npm run build

# 安裝 PM2 並設啟動點
WORKDIR /app
RUN npm install -g pm2
CMD ["pm2-runtime", "ecosystem.config.js"]

