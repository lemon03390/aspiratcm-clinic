FROM python:3.11-slim

# 安裝系統依賴
RUN apt-get update && apt-get install -y build-essential libpq-dev curl && apt-get clean

# 設定工作目錄
WORKDIR /app

# 複製 requirements 並安裝
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 複製 backend 內容
COPY backend/ ./

# 確保 data 目錄存在
RUN mkdir -p /app/data

# 啟動 FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
