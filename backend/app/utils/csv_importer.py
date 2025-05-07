import os
import shutil
import tempfile
from typing import IO, Generator

from fastapi import UploadFile

async def save_upload_file_temp(upload_file: UploadFile) -> str:
    """
    將上傳的文件保存到臨時文件中
    
    Args:
        upload_file: 上傳的文件對象
        
    Returns:
        臨時文件的路徑
    """
    try:
        suffix = os.path.splitext(upload_file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            # 讀取上傳檔案的內容
            content = await upload_file.read()
            # 寫入臨時檔案
            tmp.write(content)
            return tmp.name
    finally:
        await upload_file.close()

def handle_uploaded_file(upload_file: UploadFile) -> Generator[str, None, None]:
    """
    處理上傳的CSV文件並逐行生成
    
    Args:
        upload_file: 上傳的文件對象
        
    Yields:
        文件的每一行
    """
    try:
        # 按行讀取內容
        lines = upload_file.file.read().decode("utf-8-sig").splitlines()
        for line in lines:
            yield line
    finally:
        upload_file.file.close() 