from app.core.settings import settings
from app.core.init_db import init_db

# 從 settings 中獲取環境變數
DATABASE_URL = settings.DATABASE_URL
ALLOWED_ORIGINS = settings.ALLOWED_ORIGINS
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
