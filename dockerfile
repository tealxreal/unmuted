# 使用 Python 3.11
FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg
# 複製 requirements.txt 並安裝套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製整個專案到容器
COPY . .

# 開放容器的 8000 port
EXPOSE 8000

# 啟動 FastAPI
CMD ["uvicorn", "python.api_test:app", "--host", "0.0.0.0", "--port", "8000"]