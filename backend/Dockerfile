FROM python:3.11

WORKDIR /app

# 複製 requirements.txt 並安裝依賴
COPY backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# 複製整個 backend 程式碼
COPY backend/ ./

# 啟動 FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
