from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/reference-data/modern-diseases")
async def get_modern_diseases():
    return JSONResponse(content={"data": []})  # 暫時回傳空陣列

@router.get("/reference-data/cm-syndromes")
async def get_cm_syndromes():
    return JSONResponse(content={"data": []})  # 暫時回傳空陣列

@router.get("/reference-data/tcm-principles")
async def get_tcm_principles():
    return JSONResponse(content={"data": []})  # 暫時回傳空陣列 