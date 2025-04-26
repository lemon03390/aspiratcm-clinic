import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { diagnosisDataApi } from '../utils/api';
import AsyncSelect, { SelectOption } from './AsyncSelect';

// 中藥數據接口
interface Herb {
  id: string;
  code: string;
  name: string;
  brand: string;
  concentration_ratio: number;
  decoction_equivalent_per_g: number;
  unit: string;
  quantity_per_bottle: number;
  price: number;
  currency: string;
  is_compound: boolean;
  aliases: string[];
  ingredients?: Array<{name: string, amount: number}>;
}

// 處方藥物項目
interface HerbItem {
  id: string; // 用於唯一識別每一行
  name: string;
  code: string;
  amount: string; // 藥粉量（克）
  decoction_amount?: string; // 飲片量（克）
  is_compound?: boolean;
  brand?: string;
  price?: number;
  unit?: string;
  quantity_per_bottle?: number;
  currency?: string;
  source?: string; // 新增：藥材來源，可以是 'manual' 或 'AI_suggested'
}

interface HerbalPrescriptionData {
  herbs: HerbItem[];
  instructions: string; // 服法說明
}

interface InventoryCheckResult {
  herb_code: string;
  herb_name: string;
  has_sufficient_stock: boolean;
  available_amount: number;
  required_amount: number;
  quantity_per_bottle: number;
  current_bottles: number;
}

interface HerbalPrescriptionFormProps {
  initialValues?: HerbalPrescriptionData;
  onSave: (data: HerbalPrescriptionData) => void;
}

// 使用 forwardRef 包裝組件
const HerbalPrescriptionForm = forwardRef<
  { addHerb: (herbData: any) => void },
  HerbalPrescriptionFormProps
>(({ initialValues = { herbs: [], instructions: '' }, onSave }, ref) => {
  const [prescription, setPrescription] = useState<HerbalPrescriptionData>({
    herbs: initialValues.herbs.length > 0 
      ? initialValues.herbs.map(herb => ({
          ...herb,
          code: herb.code || '', // 確保每個藥材都有 code 屬性
          source: herb.source || 'manual'
        }))
      : [{ id: '0', name: '', code: '', amount: '', source: 'manual' }],
    instructions: initialValues.instructions || ''
  });
  const [herbOptions, setHerbOptions] = useState<Herb[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [inventoryStatus, setInventoryStatus] = useState<Record<string, InventoryCheckResult>>({});
  const [showPriceInfo, setShowPriceInfo] = useState<boolean>(false);
  
  // 計算處方總價
  const totalPrice = useMemo(() => {
    return prescription.herbs.reduce((sum, herb) => {
      if (herb.price && herb.amount) {
        // 計算需要的瓶數（向上取整）
        const amountInG = parseFloat(herb.amount) || 0;
        const bottleSize = herb.quantity_per_bottle || 100;
        const bottlesNeeded = Math.ceil(amountInG / bottleSize);
        
        return sum + (bottlesNeeded * (herb.price || 0));
      }
      return sum;
    }, 0);
  }, [prescription.herbs]);
  
  // 搜尋中藥名稱
  const searchMedicines = async (searchTerm: string): Promise<SelectOption[]> => {
    if (!searchTerm || searchTerm.length < 1) {
      return [];
    }
    
    setSearchLoading(true);
    try {
      const results = await diagnosisDataApi.searchMedicines(searchTerm);
      
      // 將搜尋結果轉換為選項格式，只顯示中文名稱
      return results.map(med => ({
        label: med.name, // 只顯示中文名稱
        value: med.code,
        data: med
      }));
    } catch (error) {
      console.error('搜尋中藥失敗:', error);
      return [];
    } finally {
      setSearchLoading(false);
    }
  };
  
  // 檢查庫存狀態
  const checkInventory = async (herbCode: string, requiredAmount: number) => {
    try {
      const response = await fetch('/api/v1/herbs/inventory/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          herb_code: herbCode,
          required_powder_amount: requiredAmount
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setInventoryStatus(prev => ({
          ...prev,
          [herbCode]: data
        }));
      }
    } catch (error) {
      console.error('Error checking inventory:', error);
    }
  };
  
  // 監聽藥品份量變化，自動檢查庫存
  useEffect(() => {
    prescription.herbs.forEach(herb => {
      if (herb.code && herb.amount) {
        const amount = parseFloat(herb.amount);
        if (!isNaN(amount) && amount > 0) {
          checkInventory(herb.code, amount);
        }
      }
    });
  }, [prescription.herbs]);
  
  // 處理新增藥材行
  const handleAddHerb = () => {
    setPrescription(prev => ({
      ...prev,
      herbs: [...prev.herbs, { id: Date.now().toString(), name: '', code: '', amount: '', source: 'manual' }]
    }));
  };
  
  // 處理刪除藥材行
  const handleRemoveHerb = (id: string) => {
    setPrescription(prev => ({
      ...prev,
      herbs: prev.herbs.filter(herb => herb.id !== id)
    }));
  };
  
  // 處理中藥選擇
  const handleHerbSelection = (id: string, selectedItems: SelectOption[]) => {
    if (selectedItems.length === 0) {
      return;
    }
    
    const selectedOption = selectedItems[0];
    const herbData = selectedOption.data;
    
    if (!herbData) {
      return;
    }
    
    setPrescription(prev => ({
      ...prev,
      herbs: prev.herbs.map(item => 
        item.id === id ? { 
          ...item, 
          name: herbData.name,
          code: herbData.code,
          brand: herbData.brand,
          is_compound: herbData.is_compound,
          unit: herbData.unit,
          price: herbData.price,
          quantity_per_bottle: herbData.quantity_per_bottle,
          currency: herbData.currency,
          source: item.source || 'manual', // 保持現有來源，或設為 manual
        } : item
      )
    }));
  };
  
  // 處理藥材份量輸入（藥粉量）
  const handleHerbAmountChange = (id: string, amount: string) => {
    setPrescription(prev => ({
      ...prev,
      herbs: prev.herbs.map(herb => {
        if (herb.id === id) {
          const numAmount = parseFloat(amount) || 0;
          // 查找對應的藥材信息計算飲片量
          const selectedHerb = herbOptions.find(h => h.code === herb.code);
          let decoctionAmount = '';
          
          if (selectedHerb && numAmount > 0) {
            // 計算飲片量 = 藥粉量 × 飲片等效值
            const decoctionValue = numAmount * (selectedHerb.decoction_equivalent_per_g || 1);
            decoctionAmount = decoctionValue.toFixed(1);
          }
          
          return { 
            ...herb, 
            amount, 
            decoction_amount: decoctionAmount 
          };
        }
        return herb;
      })
    }));
  };
  
  // 處理飲片量輸入（反向計算藥粉量）
  const handleDecoctionAmountChange = (id: string, decoctionAmount: string) => {
    setPrescription(prev => ({
      ...prev,
      herbs: prev.herbs.map(herb => {
        if (herb.id === id) {
          const numDecoction = parseFloat(decoctionAmount) || 0;
          // 查找對應的藥材信息計算藥粉量
          const selectedHerb = herbOptions.find(h => h.code === herb.code);
          let powderAmount = '';
          
          if (selectedHerb && numDecoction > 0) {
            // 計算藥粉量 = 飲片量 ÷ 飲片等效值
            const decocEq = selectedHerb.decoction_equivalent_per_g || 1;
            const powderValue = numDecoction / decocEq;
            powderAmount = powderValue.toFixed(1);
          }
          
          return { 
            ...herb, 
            amount: powderAmount, 
            decoction_amount: decoctionAmount 
          };
        }
        return herb;
      })
    }));
  };
  
  // 處理服法說明輸入
  const handleInstructionsChange = (instructions: string) => {
    setPrescription(prev => ({
      ...prev,
      instructions
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(prescription);
  };
  
  // 暴露方法給父組件
  useImperativeHandle(ref, () => ({
    addHerb: (herbData: any) => {
      const newHerb = {
        id: Date.now().toString(),
        name: herbData.name,
        code: herbData.code || '', // 確保必填字段有默認值
        amount: herbData.recommended_amount || '',
        brand: herbData.brand,
        is_compound: herbData.is_compound,
        unit: herbData.unit,
        quantity_per_bottle: herbData.quantity_per_bottle,
        currency: herbData.currency,
        source: herbData.source || 'AI_suggested'
      };
      
      setPrescription(prev => ({
        ...prev,
        herbs: [...prev.herbs, newHerb]
      }));
    }
  }));
  
  // 將藥物項目轉換為 AsyncSelect 選項
  const getSelectedOption = (herb: HerbItem): SelectOption[] => {
    if (!herb.name || !herb.code) {
      return [];
    }
    
    return [{
      label: herb.name,
      value: herb.code,
      data: herb
    }];
  };
  
  return (
    <div className="bg-white p-4 rounded-md shadow">
      <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">中藥處方</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 藥材列表 */}
        <div className="border rounded-md overflow-hidden">
          {/* 表頭 */}
          <div className="grid grid-cols-12 bg-gray-100 p-2 border-b font-medium text-sm">
            <div className="col-span-3">中藥名稱</div>
            <div className="col-span-2">藥粉量 (g)</div>
            <div className="col-span-2">飲片量 (g)</div>
            <div className="col-span-2">品牌/規格</div>
            <div className="col-span-2">庫存狀態</div>
            <div className="col-span-1 text-center">操作</div>
          </div>
          
          {/* 藥材行 */}
          <div className="divide-y">
            {prescription.herbs.map((herb, index) => {
              const inventoryCheck = herb.code ? inventoryStatus[herb.code] : null;
              const isInventorySufficient = inventoryCheck?.has_sufficient_stock;
              const isAiSuggested = herb.source === 'AI_suggested';
              
              return (
                <div key={herb.id} className={`grid grid-cols-12 p-2 items-center text-sm ${isAiSuggested ? 'bg-green-50' : ''}`}>
                  <div className="col-span-3 pr-2 flex items-center">
                    {isAiSuggested && (
                      <span className="mr-1 text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">AI</span>
                    )}
                    <AsyncSelect
                      placeholder="搜尋中藥名稱"
                      loadOptions={searchMedicines}
                      onChange={(selectedItems) => handleHerbSelection(herb.id, selectedItems)}
                      value={getSelectedOption(herb)}
                      multiple={false}
                      className="w-full"
                      disabled={false}
                    />
                  </div>
                  <div className="col-span-2 pr-2">
                    <input
                      type="text"
                      value={herb.amount}
                      onChange={(e) => handleHerbAmountChange(herb.id, e.target.value)}
                      placeholder="克數"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="col-span-2 pr-2">
                    <input
                      type="text"
                      value={herb.decoction_amount || ''}
                      onChange={(e) => handleDecoctionAmountChange(herb.id, e.target.value)}
                      placeholder="飲片換算量"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="col-span-2 pr-2 text-xs text-gray-600">
                    {herb.brand && (
                      <div>
                        <p><span className="font-medium">品牌:</span> {herb.brand}</p>
                        {showPriceInfo && herb.price && (
                          <>
                            <p><span className="font-medium">價格:</span> {herb.price} {herb.currency}/瓶</p>
                            <p><span className="font-medium">規格:</span> {herb.quantity_per_bottle}{herb.unit}/瓶</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 pr-2">
                    {inventoryCheck && (
                      <div className={`text-xs ${isInventorySufficient ? 'text-green-600' : 'text-red-600'}`}>
                        {isInventorySufficient 
                          ? `庫存充足 (${inventoryCheck.available_amount}g)` 
                          : `庫存不足 (${inventoryCheck.available_amount}g < ${inventoryCheck.required_amount}g)`
                        }
                      </div>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {prescription.herbs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveHerb(herb.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* 新增按鈕 */}
          <div className="p-2 bg-gray-50 flex justify-center">
            <button
              type="button"
              onClick={handleAddHerb}
              className="px-4 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
            >
              + 新增藥材
            </button>
          </div>
        </div>
        
        {/* 服法說明 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">服法</label>
          <textarea
            value={prescription.instructions}
            onChange={(e) => handleInstructionsChange(e.target.value)}
            placeholder="例如：共7天，每日兩次，早晚服"
            className="w-full p-2 border border-gray-300 rounded-md"
            rows={2}
          />
        </div>
        
        {/* 處方總價 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="showPriceInfo" 
              checked={showPriceInfo} 
              onChange={() => setShowPriceInfo(!showPriceInfo)}
              className="mr-2"
            />
            <label htmlFor="showPriceInfo" className="text-sm text-gray-700">顯示價格信息</label>
          </div>
          
          {showPriceInfo && (
            <div className="text-right">
              <p className="text-sm font-medium">處方預估費用: <span className="text-blue-600">{totalPrice.toFixed(2)} HKD</span></p>
              <p className="text-xs text-gray-500">(按瓶計算，部分使用則按整瓶計)</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            儲存
          </button>
        </div>
      </form>
    </div>
  );
});

HerbalPrescriptionForm.displayName = 'HerbalPrescriptionForm';

export default HerbalPrescriptionForm; 