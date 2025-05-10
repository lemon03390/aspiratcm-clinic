from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv
from pathlib import Path

# 自動載入 .env 檔案
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    # === Database Config ===
    DB_HOST: str = os.getenv("DB_HOST", "clinic")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_DATABASE")
    DB_USER: str = os.getenv("DB_USERNAME", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # === AWS Cognito ===
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-northeast-1")
    COGNITO_USER_POOL_ID: str = os.getenv("COGNITO_USER_POOL_ID", "")
    COGNITO_CLIENT_ID: str = os.getenv("COGNITO_CLIENT_ID", "")

    # === Security ===
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # === CORS Settings ===
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002", 
        "https://clinic.aspiratcm.com",
        "*"  # 允許所有來源，用於測試階段
    ]

# 創建單一實例
settings = Settings() 