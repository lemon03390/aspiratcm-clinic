#!/bin/bash

# 設定備份目錄
BACKUP_DIR="./pre-build-backup-$(date +%Y%m%d_%H%M%S)"
echo "建立備份目錄: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 備份 package.json 和 package-lock.json
echo "備份前端 package 文件..."
cp frontend/package.json "$BACKUP_DIR/frontend-package.json"
cp frontend/package-lock.json "$BACKUP_DIR/frontend-package-lock.json"

# 備份 postcss.config.js
echo "備份 postcss 配置..."
cp frontend/postcss.config.js "$BACKUP_DIR/frontend-postcss.config.js"

# 備份 Dockerfiles
echo "備份 Dockerfile 文件..."
cp frontend/Dockerfile "$BACKUP_DIR/frontend-Dockerfile"
cp backend/Dockerfile "$BACKUP_DIR/backend-Dockerfile"

echo "備份完成，文件已保存至 $BACKUP_DIR 目錄"
echo "請在執行構建前確保已備份重要文件" 