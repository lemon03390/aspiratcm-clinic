#!/bin/bash

# 設置顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定變數
EC2_HOST="ec2-user@3.104.115.1"
KEY_PATH="$HOME/Desktop/AWS-Aspriatcm/clinic-aspiratcm-app-key.pem"
LOCAL_DIR="$HOME/Desktop/AWS-Aspriatcm"
REMOTE_DIR="~/AWS-Aspriatcm"
DOCKER_COMPOSE="docker-compose.yml"

echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}Aspira TCM 系統部署腳本${NC}"
echo -e "${BLUE}=========================================${NC}"

# 確保本機專案準備就緒
echo -e "${YELLOW}檢查本地專案...${NC}"
if [ ! -f "$DOCKER_COMPOSE" ]; then
  echo -e "${RED}錯誤: 找不到 docker-compose.yml 文件${NC}"
  exit 1
fi

if [ ! -f ".env.docker" ]; then
  echo -e "${RED}錯誤: 找不到 .env.docker 文件${NC}"
  exit 1
fi

# 複製 .env.docker 到 .env 以供容器使用
echo -e "${YELLOW}複製 .env.docker 到 .env...${NC}"
cp .env.docker .env
echo -e "${GREEN}環境變數已設定${NC}"

# 連線到 EC2 並執行清理
echo -e "${YELLOW}連線到 EC2 並清理舊有容器...${NC}"
ssh -i "$KEY_PATH" "$EC2_HOST" "mkdir -p $REMOTE_DIR && if command -v docker &> /dev/null; then docker stop clinic-dev postgres-clinic || true && docker rm clinic-dev postgres-clinic || true && docker system prune -af; fi"

# 上傳本地專案到 EC2
echo -e "${YELLOW}上傳專案到 EC2...${NC}"
scp -i "$KEY_PATH" -r "$LOCAL_DIR"/* "$EC2_HOST":"$REMOTE_DIR"/

# 確保 EC2 上有 Docker 環境
echo -e "${YELLOW}確保 EC2 上安裝了 Docker...${NC}"
ssh -i "$KEY_PATH" "$EC2_HOST" "
if ! command -v docker &> /dev/null; then
    echo 'Docker 未安裝，正在安裝...'
    sudo yum update -y
    sudo yum install -y docker
    sudo service docker start
    sudo usermod -a -G docker ec2-user
    sudo chkconfig docker on
fi

if ! command -v docker-compose &> /dev/null; then
    echo 'Docker Compose 未安裝，正在安裝...'
    sudo curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-Linux-x86_64' -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
fi
"

# 在 EC2 上啟動容器
echo -e "${YELLOW}在 EC2 上啟動容器...${NC}"
ssh -i "$KEY_PATH" "$EC2_HOST" "cd $REMOTE_DIR && docker-compose up -d --build"

# 檢查容器狀態
echo -e "${YELLOW}檢查容器狀態...${NC}"
ssh -i "$KEY_PATH" "$EC2_HOST" "cd $REMOTE_DIR && docker ps"

echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "${YELLOW}您可以通過以下地址訪問您的應用：${NC}"
echo -e "${GREEN}http://clinic.aspiratcm.com/appointments ${NC}或${GREEN} http://3.104.115.1/appointments${NC}"
echo -e "${BLUE}=========================================${NC}" 