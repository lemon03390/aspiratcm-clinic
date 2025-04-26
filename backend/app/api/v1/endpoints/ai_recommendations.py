from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any

router = APIRouter()

@router.get("/recommendations")
async def get_ai_recommendations(
    modern_diagnosis: Optional[str] = Query(None, description="現代疾病診斷"),
    cm_syndrome: Optional[str] = Query(None, description="中醫證型診斷")
) -> Dict[str, List[Any]]:
    """
    獲取基於現代診斷和中醫證型的 AI 藥物建議
    
    目前版本僅返回空陣列，作為未來 AI 模型集成的預留接口
    
    TODO: 未來將在此處集成 AI 推薦模型，根據診斷資料生成合適的處方建議
    """
    
    # 記錄接收到的診斷資訊
    print(f"接收到 AI 建議請求：現代診斷 = {modern_diagnosis}, 中醫證型 = {cm_syndrome}")
    
    # 目前版本返回空陣列，預留未來 AI 推薦功能
    return {
        "suggestions": []
    } 