#!/bin/bash

# 進入後端目錄
cd "$(dirname "$0")/.."

# 獲取當前路徑
BACKEND_DIR=$(pwd)
echo "後端目錄路徑: $BACKEND_DIR"

# 檢查資料文件是否存在
if [ -f "$BACKEND_DIR/data/powder_ratio_price.json" ]; then
    echo "✅ 資料文件 powder_ratio_price.json 已確認存在"
else
    echo "❌ 錯誤: 找不到中藥資料文件 powder_ratio_price.json"
    exit 1
fi

# 執行 Python 腳本來導入中藥資料
echo "🔄 開始導入中藥資料到資料庫..."
python3 -m scripts.load_herbs_data

echo "✅ 中藥資料導入腳本執行完成。請檢查上方日誌確認是否成功。" 