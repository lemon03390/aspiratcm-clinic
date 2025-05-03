from datetime import datetime
import pytz

def now_hk():
    """取得當前香港時間"""
    tz = pytz.timezone("Asia/Hong_Kong")
    return datetime.now(tz)

def to_hk(dt: datetime) -> datetime:
    """將任意時間轉為香港時間"""
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)
    return dt.astimezone(pytz.timezone("Asia/Hong_Kong")) 