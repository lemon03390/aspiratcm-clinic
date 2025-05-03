import logging
import os
import sys
from logging.handlers import RotatingFileHandler

# 日誌檔案配置
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs")
LOG_FILE = os.path.join(LOG_DIR, "app.log")

# 確保日誌目錄存在
os.makedirs(LOG_DIR, exist_ok=True)

# 日誌格式
LOG_FORMAT = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
)

# 日誌配置
def setup_logger():
    """設置全局日誌配置"""
    # 配置根日誌器
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # 控制台處理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(LOG_FORMAT)
    root_logger.addHandler(console_handler)
    
    # 檔案處理器（滾動）
    file_handler = RotatingFileHandler(
        LOG_FILE, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'
    )
    file_handler.setFormatter(LOG_FORMAT)
    root_logger.addHandler(file_handler)


def get_logger(name: str) -> logging.Logger:
    """獲取指定名稱的日誌器"""
    logger = logging.getLogger(name)
    return logger


# 應用啟動時設置日誌
setup_logger() 