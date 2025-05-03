from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any, Callable
from pydantic import BaseModel, ValidationError
from datetime import datetime, timezone
from app.db.session import get_db
from app.models import Appointment, Doctor
import logging
import json
import traceback
from contextlib import contextmanager
from functools import wraps
import asyncio
from app.utils.time import now_hk, to_hk

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

router = APIRouter()

# 創建一個全局的星期幾映射字典，用於轉換英文星期到中文星期
WEEKDAY_MAPPING = {
    "monday": "星期一",
    "tuesday": "星期二",
    "wednesday": "星期三",
    "thursday": "星期四",
    "friday": "星期五",
    "saturday": "星期六",
    "sunday": "星期日"
}

class ConsultationTypeBase(BaseModel):
    id: str
    label: str
    subType: Optional[dict] = None

class AppointmentBase(BaseModel):
    patient_name: str
    phone_number: str
    doctor_name: str  # 修改為使用醫生名稱而不是ID
    appointment_time: datetime
    consultation_type: Optional[dict] = None  # 修改為接受字典
    is_first_time: Optional[int] = 0
    is_troublesome: Optional[int] = 0
    is_contagious: Optional[int] = 0
    referral_source: Optional[str] = None  # 新增：介紹人來源
    referral_notes: Optional[str] = None  # 新增：備註

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    patient_name: Optional[str] = None
    phone_number: Optional[str] = None
    doctor_name: Optional[str] = None
    appointment_time: Optional[datetime] = None
    status: Optional[str] = None
    next_appointment: Optional[datetime] = None
    related_appointment_id: Optional[int] = None
    consultation_type: Optional[dict] = None
    is_first_time: Optional[int] = None
    is_troublesome: Optional[int] = None
    is_contagious: Optional[int] = None
    referral_source: Optional[str] = None  # 新增：介紹人來源
    referral_notes: Optional[str] = None  # 新增：備註

class AppointmentResponse(BaseModel):
    id: int
    patient_name: str
    phone_number: str
    doctor_name: str
    appointment_time: datetime
    status: str
    next_appointment: Optional[datetime] = None
    related_appointment_id: Optional[int] = None
    consultation_type: Optional[dict] = None
    is_first_time: Optional[int] = 0
    is_troublesome: Optional[int] = 0
    is_contagious: Optional[int] = 0
    referral_source: Optional[str] = None  # 新增：介紹人來源
    referral_notes: Optional[str] = None  # 新增：備註
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # 更新為 Pydantic v2 的寫法

# 創建數據庫事務上下文管理器
@contextmanager
def db_transaction(db: Session):
    """數據庫事務上下文管理器，處理提交和回滾"""
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

# 修改裝飾器以記錄更詳細的錯誤信息
def handle_exceptions(operation_name: str):
    """用於處理路由中異常的裝飾器"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(request: Request, *args, **kwargs):
            try:
                # 記錄請求信息
                client = f"{request.client.host}:{request.client.port}" if request.client else "未知客戶端"
                route = request.url.path
                method = request.method
                
                # 打印請求頭信息
                headers = {k: v for k, v in request.headers.items() if k.lower() not in ['authorization']}
                
                logger.info(f"請求: {method} {route} 來自 {client}")
                logger.info(f"請求頭: {json.dumps(headers)}")
                
                # 嘗試獲取和記錄請求主體 - 使用更安全的方法
                try:
                    # 檢查是否是 GET 請求，GET 請求通常沒有主體
                    if method.upper() not in ['GET', 'HEAD', 'OPTIONS']:
                        # 使用更合適的方式克隆請求體
                        body_bytes = await request.body()
                        if body_bytes:
                            try:
                                body_text = body_bytes.decode('utf-8')
                                logger.info(f"請求主體: {body_text}")
                            except UnicodeDecodeError:
                                logger.warning("請求主體不是UTF-8格式，無法解碼顯示")
                    else:
                        logger.info(f"跳過讀取 {method} 請求的主體")
                except Exception as e:
                    logger.warning(f"無法解析請求主體: {str(e)}")
                
                # 執行原始處理函數
                return await func(request, *args, **kwargs)
            except ValidationError as e:
                # 處理 Pydantic 驗證錯誤，提供詳細的錯誤信息
                error_message = f"{operation_name} 資料驗證失敗"
                full_error = f"{error_message}\n{str(e)}"
                logger.error(full_error)
                
                # 格式化錯誤信息，使其更加用戶友好
                errors = []
                for error in e.errors():
                    field_path = ".".join(str(loc) for loc in error["loc"])
                    errors.append(f"{field_path}: {error['msg']}")
                
                formatted_errors = "\n".join(errors)
                logger.error(f"驗證錯誤詳情:\n{formatted_errors}")
                
                # 返回格式化的錯誤響應
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": error_message,
                        "errors": e.errors(),
                        "formatted": formatted_errors
                    }
                )
            except HTTPException as e:
                # 直接重新引發 HTTP 異常，但添加更多日誌
                route = request.url.path if request else "未知路由"
                logger.error(f"HTTP異常 [{e.status_code}] 於 {route}: {e.detail}")
                
                # 對於特定類型的錯誤，添加更具體的日誌
                if e.status_code == 404:
                    logger.error(f"資源不存在: {operation_name}")
                elif e.status_code == 400:
                    logger.error(f"錯誤的請求: {operation_name}, 詳情: {e.detail}")
                
                raise
            except Exception as e:
                # 輸出完整的原始錯誤信息，包括堆疊追蹤
                error_message = f"{operation_name}時出錯: {str(e)}"
                trace = traceback.format_exception(type(e), e, e.__traceback__)
                full_error = f"{error_message}\n{''.join(trace)}"
                
                # 記錄請求上下文和錯誤詳情
                route = request.url.path if request else "未知路由"
                client = f"{request.client.host}:{request.client.port}" if request and request.client else "未知客戶端"
                
                logger.error(f"處理 {route} 來自 {client} 時發生錯誤")
                logger.error(full_error)
                
                raise HTTPException(status_code=500, detail=error_message)
        
        @wraps(func)
        def sync_wrapper(request: Request, *args, **kwargs):
            try:
                # 記錄請求信息
                client = f"{request.client.host}:{request.client.port}" if request.client else "未知客戶端"
                route = request.url.path
                method = request.method
                
                logger.info(f"請求: {method} {route} 來自 {client}")
                
                # 在同步函數中，不嘗試讀取請求主體
                # 原因是同步函數不能使用 await，且 body() 是 coroutine
                # 為避免潛在錯誤，同步處理器中不讀取請求主體內容
                logger.info("同步處理器中不嘗試讀取請求主體")
                
                # 執行原始處理函數
                return func(request, *args, **kwargs)
            except ValidationError as e:
                # 處理 Pydantic 驗證錯誤
                error_message = f"{operation_name} 資料驗證失敗"
                full_error = f"{error_message}\n{str(e)}"
                logger.error(full_error)
                
                # 格式化錯誤信息
                errors = []
                for error in e.errors():
                    field_path = ".".join(str(loc) for loc in error["loc"])
                    errors.append(f"{field_path}: {error['msg']}")
                
                formatted_errors = "\n".join(errors)
                logger.error(f"驗證錯誤詳情:\n{formatted_errors}")
                
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": error_message,
                        "errors": e.errors(),
                        "formatted": formatted_errors
                    }
                )
            except HTTPException:
                # 直接重新引發 HTTP 異常，但添加更多日誌
                raise
            except Exception as e:
                # 輸出完整的原始錯誤信息，包括堆疊追蹤
                error_message = f"{operation_name}時出錯: {str(e)}"
                trace = traceback.format_exception(type(e), e, e.__traceback__)
                full_error = f"{error_message}\n{''.join(trace)}"
                logger.error(full_error)
                
                raise HTTPException(status_code=500, detail=error_message)
        
        # 根據函數是否是協程，返回相應的包裝器
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator

def get_optional_field(appointment, index, default=0):
    """從預約記錄中安全地獲取可選欄位值"""
    return int(appointment[index] or 0) if len(appointment) > index else default

# 創建一個函數用於構建預約字典結構，減少重複代碼
def build_appointment_dict(appointment, consultation_type=None) -> Dict[str, Any]:
    """
    根據資料庫查詢結果構建標準的預約字典。
    提供全面的錯誤處理和欄位安全檢查，避免缺少欄位或格式問題。
    """
    try:
        # 檢查是否有足夠的欄位
        if len(appointment) < 10:
            logger.warning(f"預約記錄欄位不足: {appointment}")
            # 至少需要 id, patient_name, phone_number, doctor_name, appointment_time
            # status, next_appointment, related_appointment_id, consultation_type, created_at
            raise ValueError("預約記錄欄位不足")
        
        # 處理 consultation_type
        if consultation_type is None:
            consultation_type = parse_consultation_type(appointment[8])
        
        # 使用安全的訪問方式，並提供合理的預設值
        return {
            "id": appointment[0],
            "patient_name": appointment[1] or "",
            "phone_number": appointment[2] or "",
            "doctor_name": appointment[3] or "已離職醫師",
            "appointment_time": to_hk(appointment[4]) if appointment[4] else None,
            "status": appointment[5] or "未知狀態",
            "next_appointment": to_hk(appointment[6]) if appointment[6] else None,
            "related_appointment_id": appointment[7],
            "consultation_type": consultation_type,
            "created_at": to_hk(appointment[9]) if appointment[9] else to_hk(now_hk()),
            "updated_at": to_hk(appointment[10]) if len(appointment) > 10 and appointment[10] else to_hk(now_hk()),
            "is_first_time": get_optional_field(appointment, 11),
            "is_troublesome": get_optional_field(appointment, 12),
            "is_contagious": get_optional_field(appointment, 13),
            "referral_source": appointment[14] if len(appointment) > 14 else None,
            "referral_notes": appointment[15] if len(appointment) > 15 else None
        }
    except Exception as e:
        logger.error(f"構建預約字典時出錯: {str(e)}, 預約記錄: {appointment}")
        # 返回一個基本的字典，避免完全失敗
        return create_fallback_dict(appointment, e)

# 創建一個處理consultation_type的函數來減少重複代碼
def parse_consultation_type(data) -> Optional[Dict[str, Any]]:
    """
    解析consultation_type數據，處理各種可能的格式和錯誤。
    支援字串JSON、字典對象和None值的處理。
    """
    if data is None:
        return None
    
    # 已經是字典的情況直接返回
    if isinstance(data, dict):
        return data
    
    # 字串情況嘗試解析JSON
    if isinstance(data, str):
        try:
            if not data.strip():
                return None
                
            parsed_data = json.loads(data)
            
            # 確保返回的是字典
            if isinstance(parsed_data, dict):
                return parsed_data
            
            # 非字典結果
            logger.warning(f"consultation_type 解析結果非字典: {parsed_data}")
            return {"data": parsed_data}
                
        except json.JSONDecodeError as e:
            logger.error(f"解析 consultation_type JSON 失敗: {e}, 原始數據: {data}")
            # 嘗試移除可能造成問題的字符後再次解析
            try:
                # 替換掉可能導致錯誤的特殊字符
                cleaned_data = data.replace("'", '"').replace("\\", "\\\\")
                return json.loads(cleaned_data)
            except Exception:
                # 返回原始字串作為值
                return {"raw_data": data}
    
    # 其他類型的情況
    logger.warning(f"未知的 consultation_type 類型: {type(data)}")
    try:
        # 嘗試將其轉換為字串再解析
        return {"value": str(data)}
    except Exception as e:
        logger.error(f"處理 consultation_type 時出錯: {e}")
        return {"error": "無法解析的數據類型"}

# 創建一個函數來處理狀態和日期的格式化
def format_status_with_date(status: str, date: datetime) -> str:
    """根據狀態和日期格式化顯示文字"""
    date_str = date.strftime("%m-%d")
    
    status_formats = {
        '已改期': f"已改期至 {date_str}",
        '預約覆診': f"將於 {date_str}覆診"
    }
    
    return status_formats.get(status, status)

# 在各個需要轉換星期幾名稱的地方使用WEEKDAY_MAPPING
def get_weekday_name(day_name: str) -> str:
    """根據英文星期名獲取中文星期名"""
    return WEEKDAY_MAPPING.get(day_name.lower(), "未知星期")

# 預約查詢 SQL 生成函數
def get_appointment_query(join_type: str = "LEFT", condition: str = "") -> str:
    """生成查詢預約的SQL語句，可選條件子句"""
    sql = f"""
    SELECT a.id, a.patient_name, a.phone_number, d.name as doctor_name, 
           a.appointment_time, a.status, a.next_appointment, 
           a.related_appointment_id, a.consultation_type, a.created_at, a.updated_at,
           a.is_first_time, a.is_troublesome, a.is_contagious,
           a.referral_source, a.referral_notes
    FROM appointments a
    {join_type} JOIN doctors d ON a.doctor_id = d.id
    """
    return f"{sql} WHERE {condition}" if condition else sql

# 修改驗證醫生排班與預約時間是否匹配的函數
def validate_doctor_schedule(doctor_name: str, doctor_schedule: List[str], appointment_time: datetime, db: Session = None) -> None:
    """驗證醫生排班與預約時間是否匹配，不匹配則拋出HTTP異常"""
    
    # 確保appointment_time是datetime對象
    if isinstance(appointment_time, str):
        if 'Z' in appointment_time or '+' in appointment_time:
            # ISO格式的UTC時間
            appointment_time = datetime.fromisoformat(appointment_time.replace('Z', '+00:00'))
            logger.info(f"將ISO時間轉換為datetime: {appointment_time}")
        else:
            # 不帶時區的本地時間
            appointment_time = datetime.fromisoformat(appointment_time)
            logger.info(f"將本地時間字符串轉換為datetime: {appointment_time}")
    
    # 獲取星期幾（英文小寫）
    appointment_day = appointment_time.strftime("%A").lower()
    weekday_name = get_weekday_name(appointment_day)
    
    logger.info(f"檢查醫師 {doctor_name} 在 {weekday_name} ({appointment_day}) 的排班")
    logger.info(f"醫師排班數據: {doctor_schedule}, 類型: {type(doctor_schedule)}")
    
    # 處理排班數據的各種可能格式
    schedule_list = doctor_schedule
    if isinstance(doctor_schedule, str):
        try:
            schedule_list = json.loads(doctor_schedule)
            logger.info(f"成功將排班字符串解析為列表: {schedule_list}")
        except json.JSONDecodeError as e:
            logger.error(f"無法解析排班數據: {str(e)}, 原始數據: {doctor_schedule}")
            # 使用保守的方式處理錯誤，假設醫師無法應診
            schedule_list = []
    
    if not isinstance(schedule_list, list):
        logger.error(f"排班數據格式不正確, 類型: {type(schedule_list)}, 值: {schedule_list}")
        schedule_list = []
    
    if schedule_list and appointment_day not in schedule_list:
        logger.error(f"醫師在{weekday_name}不應診，排班日為：{schedule_list}")
        raise HTTPException(status_code=400, detail=f"醫師{doctor_name} {weekday_name}放緊假，麻煩約第二日")
    
    logger.info(f"醫師 {doctor_name} 在 {weekday_name} 可應診")

# 添加按電話號碼查詢預約的路由 - 應該放在參數路由之前
@router.get("/by-phone")
@handle_exceptions("查詢預約")
async def query_appointments_by_phone(
    request: Request,
    phone_number: str = Query(
        "",
        description="請輸入 8 位數電話，如 90127957、62348765 等，用於查詢患者預約記錄",
        example="90127957",
        title="聯絡電話",
    ), 
    db: Session = Depends(get_db)
):
    """
    根據電話號碼查詢預約記錄
    
    - 若有多筆相符記錄，則按預約時間降序排列（最近的優先）
    - 若無相符記錄，則返回空列表
    - 若未提供電話號碼或格式錯誤，將返回空列表而非錯誤
    """
    # 記錄查詢參數（方便除錯）
    query_params = dict(request.query_params)
    logger.info(f"查詢預約參數: {query_params}")
    logger.info(f"處理電話號碼查詢: phone_number={phone_number}, 類型={type(phone_number)}")
    
    # 確保清理前後空白
    phone_number = phone_number.strip()
    
    # 內部驗證邏輯，不依賴 FastAPI 422 錯誤
    if not phone_number:
        logger.warning("接收到空的電話號碼參數")
        return []  # 如果電話號碼為空，直接返回空列表
    
    # 構建查詢條件
    conditions = ["a.phone_number = :phone"]
    params = {"phone": phone_number}
    
    logger.info(f"電話號碼精確匹配: {params['phone']}")
    
    # 構建 SQL 查詢
    condition_str = " AND ".join(conditions)
    query_string = get_appointment_query("LEFT", condition_str) + " ORDER BY a.appointment_time DESC"
    
    logger.info(f"SQL查詢: {query_string}")
    logger.info(f"查詢參數: {params}")
    
    # 執行查詢
    try:
        query = text(query_string)
        appointments = db.execute(query, params).fetchall()
        
        logger.info(f"查詢結果數量: {len(appointments)}")
        
        # 如果沒有找到預約，返回空列表
        if not appointments:
            logger.info(f"未找到電話號碼為 {phone_number} 的預約記錄")
            return []
        
        # 構建返回數據
        result = []
        
        for appointment in appointments:
            try:
                appointment_dict = build_appointment_dict(appointment)
                result.append(appointment_dict)
            except Exception as e:
                logger.error(f"處理預約數據時出錯: {str(e)}")
                raise HTTPException(status_code=500, detail=f"處理預約數據時出錯: {str(e)}") from e
        
        return result
    except Exception as e:
        if not isinstance(e, HTTPException):
            logger.error(f"電話號碼查詢預約異常: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail="查詢預約時發生錯誤，請稍後再試"
            ) from e
        raise

# 獲取所有預約列表
@router.get("")
@handle_exceptions("獲取預約列表")
async def get_appointments(request: Request, db: Session = Depends(get_db)):
    """獲取所有預約列表，按預約時間排序"""
    logger.info("開始獲取所有預約列表")
    
    try:
        # 使用聯合查詢獲取預約和醫師資訊
        query = text(f"{get_appointment_query()} ORDER BY a.appointment_time")
        
        # 執行查詢
        appointments = db.execute(query).fetchall()
        logger.info(f"成功獲取 {len(appointments)} 筆預約記錄")
        
        # 處理每筆預約記錄，確保異常情況能被捕獲
        result = []
        for appointment in appointments:
            try:
                # 解析 consultation_type
                consultation_type = parse_consultation_type(appointment[8])
                
                # 構建預約字典
                appointment_dict = build_appointment_dict(appointment, consultation_type)
                result.append(appointment_dict)
            except Exception as e:
                # 記錄特定預約處理錯誤，但繼續處理其他預約
                if len(appointment) > 0:
                    logger.error(f"處理預約 ID {appointment[0]} 時出錯: {str(e)}")
                else:
                    logger.error(f"處理預約記錄時出錯: {str(e)}, 記錄: {appointment}")
                
                # 添加錯誤預約的基本信息到結果中
                result.append(create_fallback_dict(appointment, e))
        
        logger.info(f"成功返回 {len(result)} 筆預約記錄")
        return result
    except Exception as e:
        # 錯誤時詳細記錄
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"獲取預約列表時出錯: {str(e)}\n{error_trace}")
        raise

# 根據預約 ID 獲取預約資訊 - 移到特定路徑後面
@router.get("/{appointment_id}", response_model=None)
@handle_exceptions("獲取預約詳情")
async def get_appointment_by_id(request: Request, appointment_id: int, db: Session = Depends(get_db)):
    """根據預約 ID 獲取預約詳情"""
    try:
        logger.info(f"獲取預約詳情 - ID: {appointment_id}")
        
        # 使用簡單直接的 SQL 查詢
        sql = """
        SELECT 
            a.id, a.patient_name, a.phone_number, d.name as doctor_name, 
            a.appointment_time, a.status, a.next_appointment, 
            a.related_appointment_id, a.consultation_type, a.created_at, a.updated_at,
            a.is_first_time, a.is_troublesome, a.is_contagious,
            a.referral_source, a.referral_notes
        FROM 
            appointments a
        LEFT JOIN 
            doctors d ON a.doctor_id = d.id
        WHERE 
            a.id = :id
        """
        
        # 執行查詢
        if not (result := db.execute(text(sql), {"id": appointment_id}).fetchone()):
            logger.warning(f"未找到 ID 為 {appointment_id} 的預約")
            raise HTTPException(status_code=404, detail=f"未找到 ID 為 {appointment_id} 的預約")
        
        # 構建返回數據
        appointment_dict = build_appointment_dict(result)
        
        logger.info(f"成功返回 ID 為 {appointment_id} 的預約")
        return appointment_dict
        
    except Exception as e:
        logger.error(f"獲取預約時出錯: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取預約時出錯: {str(e)}") from e

# 修改創建預約的路由處理函數，以記錄更多信息
@router.post("")
@handle_exceptions("創建預約")
async def create_appointment(request: Request, appointment: AppointmentCreate, db: Session = Depends(get_db)):
    """
    創建新預約的API端點
    
    參數:
    - appointment: 預約創建模型
    - db: 資料庫session依賴注入
    
    返回:
    - 創建成功的預約詳情
    """
    with db_transaction(db):
        # 記錄預約數據
        logger.info(f"創建預約請求 - 患者: {appointment.patient_name}, 電話: {appointment.phone_number}, 醫師: {appointment.doctor_name}")
        
        # 根據醫生名稱查找醫生ID
        doctor_sql = text("SELECT id, schedule FROM doctors WHERE name = :name")
        doctor = db.execute(doctor_sql, {"name": appointment.doctor_name}).fetchone()
        
        if not doctor:
            # 記錄醫師不存在的錯誤
            logger.error(f"醫師不存在: {appointment.doctor_name}")
            raise HTTPException(status_code=404, detail=f"醫師 '{appointment.doctor_name}' 不存在")
        
        doctor_id = doctor[0]
        doctor_schedule = doctor[1] or []
        logger.info(f"找到醫師: ID={doctor_id}, 排班={doctor_schedule}")
        
        # 如果 doctor_schedule 是字串（即 Postgres 取出來時係 JSON 字串），就轉回陣列
        if isinstance(doctor_schedule, str):
            try:
               doctor_schedule = json.loads(doctor_schedule)
               logger.info(f"成功解析醫師排班JSON: {doctor_schedule}")
            except json.JSONDecodeError as e:
               logger.error(f"解析醫師排班JSON失敗: {str(e)}, 原始數據: {doctor_schedule}")
               doctor_schedule = []
               logger.warning("使用空排班列表作為備用")

        # 檢查醫生是否在該日期應診
        # 如果前端發送的是不帶時區的時間，確保將其視為本地時間處理
        appointment_time = appointment.appointment_time
        if isinstance(appointment_time, str) and 'Z' not in appointment_time and '+' not in appointment_time:
            appointment_time = datetime.fromisoformat(appointment_time)
            logger.info(f"轉換本地時間格式: {appointment_time}")
        
        try:
            validate_doctor_schedule(
                appointment.doctor_name, 
                doctor_schedule, 
                appointment_time
            )
            logger.info("醫師排班驗證通過")
        except HTTPException as e:
            logger.warning(f"醫師排班驗證失敗: {e.detail}")
            raise
        
        # 轉換 consultation_type 為 JSON 字符串
        consultation_type_json = None
        if appointment.consultation_type:
            try:
                consultation_type_json = json.dumps(appointment.consultation_type)
                logger.info(f"成功序列化診療類型: {consultation_type_json}")
            except Exception as e:
                logger.error(f"序列化診療類型失敗: {str(e)}, 原始數據: {appointment.consultation_type}")
                consultation_type_json = json.dumps({"error": "無法序列化的診療類型"})
                logger.warning("使用錯誤占位符作為診療類型")
        
        # 使用參數化查詢插入預約，避免 SQL 注入
        now = now_hk()
        
        sql = text("""
        INSERT INTO appointments (
            patient_name, phone_number, doctor_id, appointment_time, status, 
            consultation_type, is_first_time, is_troublesome, is_contagious, 
            created_at, updated_at, referral_source, referral_notes
        )
        VALUES (
            :patient_name, :phone_number, :doctor_id, :appointment_time, :status, 
            :consultation_type, :is_first_time, :is_troublesome, :is_contagious, 
            :created_at, :updated_at, :referral_source, :referral_notes
        )
        RETURNING id
        """)
        
        params = {
            "patient_name": appointment.patient_name,
            "phone_number": appointment.phone_number,
            "doctor_id": doctor_id,
            "appointment_time": appointment_time,
            "status": "未應診",
            "consultation_type": consultation_type_json,
            "is_first_time": appointment.is_first_time,
            "is_troublesome": appointment.is_troublesome,
            "is_contagious": appointment.is_contagious,
            "referral_source": appointment.referral_source,
            "referral_notes": appointment.referral_notes,
            "created_at": now,
            "updated_at": now
        }
        
        logger.info(f"執行SQL插入預約, 參數: {params}")
        appointment_id = db.execute(sql, params).scalar()
        logger.info(f"預約創建成功, ID: {appointment_id}")
        
        # 構建響應
        response_data = {
            "id": appointment_id,
            "patient_name": appointment.patient_name,
            "phone_number": appointment.phone_number,
            "doctor_name": appointment.doctor_name,
            "appointment_time": appointment_time,
            "status": "未應診",
            "next_appointment": None,
            "related_appointment_id": None,
            "consultation_type": appointment.consultation_type,
            "is_first_time": appointment.is_first_time,
            "is_troublesome": appointment.is_troublesome,
            "is_contagious": appointment.is_contagious,
            "referral_source": appointment.referral_source,
            "referral_notes": appointment.referral_notes,
            "created_at": now,
            "updated_at": now
        }
        
        logger.info(f"返回創建成功的預約數據, ID: {appointment_id}")
        return response_data

# 根據預約 ID 更新預約
@router.put("/{appointment_id}")
@handle_exceptions("更新預約")
async def update_appointment(request: Request, appointment_id: int, appointment_update: AppointmentUpdate, db: Session = Depends(get_db)):
    """根據預約 ID 更新預約內容"""
    logger.info(f"請求更新預約 ID: {appointment_id}")
    
    # 使用一致的交易管理方式
    with db_transaction(db):
        # 檢查預約是否存在
        check_sql = text("SELECT patient_name FROM appointments WHERE id = :id")
        if not (appointment := db.execute(check_sql, {"id": appointment_id}).fetchone()):
            logger.warning(f"未找到 ID 為 {appointment_id} 的預約")
            raise HTTPException(status_code=404, detail=f"未找到 ID 為 {appointment_id} 的預約")
        
        patient_name = appointment[0]
        logger.info(f"找到預約 ID: {appointment_id}, 患者: {patient_name}")
        
        # 從模型中提取所有非空字段
        update_data = _extract_non_empty_fields(appointment_update)
        
        # 處理醫生相關的更新
        if appointment_update.doctor_name:
            update_data["doctor_id"] = _get_doctor_id(db, appointment_update.doctor_name)
        
        # 處理特殊字段
        if appointment_update.consultation_type:
            update_data["consultation_type"] = json.dumps(appointment_update.consultation_type)
            
        # 驗證醫生排班與預約時間
        if appointment_update.appointment_time and appointment_update.doctor_name:
            _validate_doctor_appointment(db, appointment_update.doctor_name, appointment_update.appointment_time)
        
        # 如果沒有數據需要更新，直接返回當前數據
        if not update_data:
            return _get_current_appointment(db, appointment_id)
        
        # 添加更新時間
        update_data["updated_at"] = now_hk()
        
        # 執行更新
        _update_appointment_record(db, appointment_id, update_data)
        logger.info(f"成功更新預約 ID: {appointment_id}")
        
        # 返回更新後的數據
        return _get_current_appointment(db, appointment_id)

def _extract_non_empty_fields(appointment_update: AppointmentUpdate) -> dict:
    """從更新模型中提取所有非空字段"""
    fields = [
        "patient_name", "phone_number", "status", "next_appointment", 
        "related_appointment_id", "is_first_time", "is_troublesome", 
        "is_contagious", "referral_source", "referral_notes", "appointment_time"
    ]
    
    update_data = {}
    for field in fields:
        value = getattr(appointment_update, field, None)
        if value is not None:
            update_data[field] = value
            
    return update_data

def _get_doctor_id(db: Session, doctor_name: str) -> int:
    """通過醫生名稱獲取醫生ID"""
    doctor_query = text("SELECT id FROM doctors WHERE name = :name")
    if not (doctor := db.execute(doctor_query, {"name": doctor_name}).fetchone()):
        logger.warning(f"未找到醫生: {doctor_name}")
        raise HTTPException(status_code=404, detail=f"未找到醫生: {doctor_name}")
    return doctor[0]

def _validate_doctor_appointment(db: Session, doctor_name: str, appointment_time: datetime) -> None:
    """驗證醫生排班與預約時間是否匹配"""
    doctor_query = text("SELECT schedule FROM doctors WHERE name = :name")
    if doctor_result := db.execute(doctor_query, {"name": doctor_name}).fetchone():
        if schedule := doctor_result[0]:
            validate_doctor_schedule(doctor_name, schedule, appointment_time, db)

def _update_appointment_record(db: Session, appointment_id: int, update_data: dict) -> None:
    """執行更新SQL操作"""
    fields = ", ".join([f"{key} = :{key}" for key in update_data])
    update_sql = text(f"UPDATE appointments SET {fields} WHERE id = :id")
    
    params = {**update_data, "id": appointment_id}
    logger.info(f"執行更新SQL: {update_sql.text}, 參數數量: {len(params)}")
    db.execute(update_sql, params)

def _get_current_appointment(db: Session, appointment_id: int) -> dict:
    """獲取當前預約數據"""
    query_string = get_appointment_query("LEFT", "a.id = :appointment_id")
    query = text(query_string)
    appointment = db.execute(query, {"appointment_id": appointment_id}).fetchone()
    
    consultation_type = parse_consultation_type(appointment[8])
    return build_appointment_dict(appointment, consultation_type)

# 根據預約 ID 刪除預約
@router.delete("/{appointment_id}")
@handle_exceptions("刪除預約")
async def delete_appointment(request: Request, appointment_id: int, db: Session = Depends(get_db)):
    """根據預約 ID 刪除預約"""
    logger.info(f"請求刪除預約 ID: {appointment_id}")
    
    # 使用一致的交易管理方式
    with db_transaction(db):
        # 檢查預約是否存在
        check_sql = text("SELECT patient_name FROM appointments WHERE id = :id")
        if not (appointment := db.execute(check_sql, {"id": appointment_id}).fetchone()):
            logger.warning(f"未找到 ID 為 {appointment_id} 的預約")
            raise HTTPException(status_code=404, detail=f"未找到 ID 為 {appointment_id} 的預約")
        
        patient_name = appointment[0]
        logger.info(f"找到預約 ID: {appointment_id}, 患者: {patient_name}")
        
        # 檢查是否有關聯的其他預約（以這個預約為關聯預約）
        check_related_sql = text("SELECT id FROM appointments WHERE related_appointment_id = :id")
        
        # 如果有關聯的其他預約，先清除它們的關聯關係
        if related_appointments := db.execute(check_related_sql, {"id": appointment_id}).fetchall():
            logger.info(f"發現 {len(related_appointments)} 個與預約 ID {appointment_id} 相關聯的預約，清除它們的關聯關係")
            
            update_related_sql = text("""
            UPDATE appointments
            SET related_appointment_id = NULL
            WHERE related_appointment_id = :id
            """)
            
            db.execute(update_related_sql, {"id": appointment_id})
        
        # 刪除預約
        delete_sql = text("DELETE FROM appointments WHERE id = :id")
        logger.info(f"執行刪除SQL: {delete_sql.text}, ID: {appointment_id}")
        db.execute(delete_sql, {"id": appointment_id})
        # 交易會在 with 區塊結束時自動提交
        
        logger.info(f"成功刪除預約 ID: {appointment_id}, 患者: {patient_name}")
        
        return {"message": f"成功刪除 {patient_name} 的預約", "id": appointment_id}

def create_fallback_dict(appointment, error) -> Dict[str, Any]:
    """創建預約處理失敗時的後備字典"""
    if len(appointment) > 0:
        return {
            "id": appointment[0],
            "patient_name": appointment[1] if len(appointment) > 1 else "未知患者",
            "phone_number": appointment[2] if len(appointment) > 2 else "",
            "doctor_name": appointment[3] if len(appointment) > 3 else "未知醫師",
            "appointment_time": appointment[4] if len(appointment) > 4 else datetime.now(timezone.utc),
            "status": "處理錯誤",
            "referral_source": None,
            "referral_notes": None,
            "error": str(error)
        }
    
    return {
        "id": 0,
        "patient_name": "資料錯誤",
        "phone_number": "",
        "doctor_name": "未知醫師",
        "appointment_time": datetime.now(timezone.utc),
        "status": "處理錯誤",
        "referral_source": None,
        "referral_notes": None,
        "error": str(error)
    } 
