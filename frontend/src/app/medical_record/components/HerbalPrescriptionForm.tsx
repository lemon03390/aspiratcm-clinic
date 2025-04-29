import { debounce } from 'lodash';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { diagnosisDataApi } from '../utils/api';
import AsyncSelect, { SelectOption } from './AsyncSelect';

// 庫存狀態枚舉
export enum InventoryStatus {
  NORMAL = 'normal',
  LOW = 'low',
  OUT_OF_STOCK = 'out_of_stock',
  UNKNOWN = 'unknown'
}

// 中藥數據接口
interface Herb {
  id?: string;
  code: string;
  name: string;
  brand: string;
  concentration_ratio: number;
  conversion_ratio?: number;
  decoction_equivalent_per_g: number;
  price_per_gram?: number;
  price?: number; // 可能從API返回的價格字段
  quantity_per_bottle?: number; // 每瓶含量，用於計算單價
  unit: string;
  is_compound: boolean;
  registration_code?: string;
  ingredients?: Array<{ name: string; amount: number }>;
  aliases?: string[];
}

// 處方藥物項目
interface HerbItem {
  id: string; // 用於唯一識別每一行
  code: string;
  name: string;
  brand: string;
  powder_amount: string; // 藥粉量（克）
  decoction_amount: string; // 飲片量（克）
  price_per_gram: number;
  total_price: number;
  unit: string;
  is_compound: boolean;
  registration_code?: string;
  ingredients?: Array<{ name: string; amount: number }>;
  concentration_ratio: number;
  decoction_equivalent_per_g: number;
  inventory_status: InventoryStatus;
  source?: string; // 可以是 'manual' 或 'AI_suggested'
}

// 結構化服法說明
interface StructuredInstructions {
  total_days: number;
  times_per_day: number;
  timing: string;
}

interface HerbalPrescriptionData {
  herbs: HerbItem[];
  instructions: string; // 服法說明
  structured_instructions: StructuredInstructions; // 結構化服法
  total_price: number;
  per_dose_price: number; // 每服單價
}

interface InventoryCheckResult {
  herb_code: string;
  herb_name: string;
  has_sufficient_stock: boolean;
  available_amount: number;
  required_amount: number;
}

interface HerbalPrescriptionFormProps {
  initialValues?: HerbalPrescriptionData;
  onSave: (data: HerbalPrescriptionData) => void;
}

// 使用 forwardRef 包裝組件
const HerbalPrescriptionForm = forwardRef<
  { addHerb: (herbData: any) => void; resetForm: () => void },
  HerbalPrescriptionFormProps
>(({ initialValues, onSave }, ref) => {
  const defaultPrescription: HerbalPrescriptionData = {
    herbs: [],
    instructions: '',
    structured_instructions: {
      total_days: 7,
      times_per_day: 2,
      timing: '早晚服'
    },
    total_price: 0,
    per_dose_price: 0
  };

  const [prescription, setPrescription] = useState<HerbalPrescriptionData>(
    initialValues ||
    {
      ...defaultPrescription,
      herbs: [createEmptyHerbItem()]
    }
  );

  const [herbOptions, setHerbOptions] = useState<Herb[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [inventoryStatus, setInventoryStatus] = useState<Record<string, InventoryCheckResult>>({});
  const [showPriceInfo, setShowPriceInfo] = useState<boolean>(true);
  const [allHerbs, setAllHerbs] = useState<Herb[]>([]);
  const [isLoadingHerbs, setIsLoadingHerbs] = useState<boolean>(false);

  // 創建空白藥物項目
  function createEmptyHerbItem(): HerbItem {
    return {
      id: Date.now().toString(),
      code: '',
      name: '',
      brand: '',
      powder_amount: '',
      decoction_amount: '',
      price_per_gram: 0,
      total_price: 0,
      unit: 'g',
      is_compound: false,
      concentration_ratio: 1,
      decoction_equivalent_per_g: 1,
      inventory_status: InventoryStatus.UNKNOWN,
      source: 'manual'
    };
  }

  // 載入所有中藥資料
  useEffect(() => {
    const loadHerbs = async () => {
      setIsLoadingHerbs(true);
      try {
        const herbs = await diagnosisDataApi.getPowderRatioPrice();
        setAllHerbs(herbs);
        console.log('載入中藥資料成功，共', herbs.length, '筆');
      } catch (error) {
        console.error('載入中藥資料失敗:', error);
      } finally {
        setIsLoadingHerbs(false);
      }
    };

    loadHerbs();
  }, []);

  // 計算處方總價和每服單價
  useEffect(() => {
    const totalPrice = prescription.herbs.reduce((sum, herb) => {
      return sum + herb.total_price;
    }, 0);

    // 計算每服價格
    const totalDoses = prescription.structured_instructions.total_days * prescription.structured_instructions.times_per_day;
    const perDosePrice = totalDoses > 0 ? totalPrice / totalDoses : 0;

    setPrescription(prev => ({
      ...prev,
      total_price: totalPrice,
      per_dose_price: perDosePrice
    }));
  }, [prescription.herbs, prescription.structured_instructions.total_days, prescription.structured_instructions.times_per_day]);

  // 搜尋中藥名稱
  const searchMedicines = async (searchTerm: string): Promise<SelectOption[]> => {
    if (!searchTerm || searchTerm.length < 1) {
      return [];
    }

    setSearchLoading(true);
    try {
      // 先從本地已載入的數據搜尋
      if (allHerbs.length > 0) {
        const filteredHerbs = allHerbs.filter(herb =>
          herb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (herb.aliases?.some(alias => alias.toLowerCase().includes(searchTerm.toLowerCase())))
        );

        return filteredHerbs.map(herb => {
          // 計算每克價格
          const pricePerGram = calculatePricePerGram(herb);

          return {
            // 在標籤中明確顯示品牌名稱
            label: `${herb.name} - ${herb.brand || '未知品牌'}`,
            value: herb.code,
            data: {
              ...herb,
              // 設置計算後的每克價格
              price_per_gram: pricePerGram
            }
          };
        });
      }

      // 如果本地數據未載入，則調用API
      const results = await diagnosisDataApi.searchMedicines(searchTerm);

      return results.map(med => {
        // 計算每克價格
        const pricePerGram = calculatePricePerGram(med);

        return {
          // 在標籤中明確顯示品牌名稱
          label: `${med.name} - ${med.brand || '未知品牌'}`,
          value: med.code,
          data: {
            ...med,
            // 設置計算後的每克價格
            price_per_gram: pricePerGram
          }
        };
      });
    } catch (error) {
      console.error('搜尋中藥失敗:', error);
      return [];
    } finally {
      setSearchLoading(false);
    }
  };

  // 計算每克價格的輔助函數
  const calculatePricePerGram = (herb: Herb): number => {
    // 如果已有每克價格，直接返回
    if (typeof herb.price_per_gram === 'number' && !isNaN(herb.price_per_gram) && herb.price_per_gram > 0) {
      return herb.price_per_gram;
    }

    // 如果有總價和每瓶數量，則計算每克價格
    if (typeof herb.price === 'number' && typeof herb.quantity_per_bottle === 'number'
      && !isNaN(herb.price) && !isNaN(herb.quantity_per_bottle) && herb.quantity_per_bottle > 0) {
      return herb.price / herb.quantity_per_bottle;
    }

    // 無法計算時返回0
    return 0;
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

        // 更新藥材的庫存狀態
        setPrescription(prev => ({
          ...prev,
          herbs: prev.herbs.map(herb => {
            if (herb.code === herbCode) {
              let status = InventoryStatus.NORMAL;
              if (data.has_sufficient_stock === false) {
                status = data.available_amount > 0 ? InventoryStatus.LOW : InventoryStatus.OUT_OF_STOCK;
              }
              return {
                ...herb,
                inventory_status: status
              };
            }
            return herb;
          })
        }));
      }
    } catch (error) {
      console.error('Error checking inventory:', error);
    }
  };

  // 使用 debounce 延遲庫存檢查，避免頻繁請求
  const debouncedCheckInventory = useMemo(
    () => debounce((code: string, amount: number) => checkInventory(code, amount), 500),
    []
  );

  // 監聽藥品份量變化，自動檢查庫存
  useEffect(() => {
    prescription.herbs.forEach(herb => {
      if (herb.code && herb.powder_amount) {
        const amount = parseFloat(herb.powder_amount);
        if (!isNaN(amount) && amount > 0) {
          debouncedCheckInventory(herb.code, amount);
        }
      }
    });

    // 清除 debounce
    return () => {
      debouncedCheckInventory.cancel();
    };
  }, [prescription.herbs, debouncedCheckInventory]);

  // 處理新增藥材行
  const handleAddHerb = () => {
    setPrescription(prev => ({
      ...prev,
      herbs: [...prev.herbs, createEmptyHerbItem()]
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
    const herbData = selectedOption.data as Herb;

    if (!herbData) {
      return;
    }

    setPrescription(prev => ({
      ...prev,
      herbs: prev.herbs.map(item => {
        if (item.id === id) {
          // 計算每克價格
          const pricePerGram = calculatePricePerGram(herbData);

          const newHerb: HerbItem = {
            ...item,
            code: herbData.code,
            name: herbData.name,
            brand: herbData.brand || '',
            is_compound: herbData.is_compound || false,
            ingredients: herbData.ingredients,
            registration_code: herbData.registration_code,
            concentration_ratio: herbData.concentration_ratio || 1,
            decoction_equivalent_per_g: herbData.decoction_equivalent_per_g || 1,
            price_per_gram: pricePerGram,
            unit: herbData.unit || 'g',
            source: item.source || 'manual',
          };

          // 如果已經輸入了飲片量，則計算藥粉量
          if (item.decoction_amount) {
            const decoctionAmount = parseFloat(item.decoction_amount);
            if (!isNaN(decoctionAmount)) {
              const powderAmount = calculatePowderAmount(
                decoctionAmount,
                herbData.decoction_equivalent_per_g,
                herbData.concentration_ratio
              );
              newHerb.powder_amount = powderAmount.toFixed(1);
              // 計算價格
              newHerb.total_price = powderAmount * pricePerGram;
            }
          }

          // 如果已經輸入了藥粉量，則計算飲片量和價格
          if (item.powder_amount && !item.decoction_amount) {
            const powderAmount = parseFloat(item.powder_amount);
            if (!isNaN(powderAmount)) {
              const decoctionAmount = calculateDecoctionAmount(
                powderAmount,
                herbData.decoction_equivalent_per_g,
                herbData.concentration_ratio
              );
              newHerb.decoction_amount = decoctionAmount.toFixed(1);
              // 計算價格
              newHerb.total_price = powderAmount * pricePerGram;
            }
          }

          return newHerb;
        }
        return item;
      })
    }));
  };

  // 計算藥粉量
  const calculatePowderAmount = (
    decoctionAmount: number,
    decoctionEquivalentPerG: number,
    concentrationRatio: number
  ): number => {
    // 藥粉量 (g) = (飲片量 (g) ÷ decoction_equivalent_per_g) × concentration_ratio
    return (decoctionAmount / decoctionEquivalentPerG) * concentrationRatio;
  };

  // 計算飲片量
  const calculateDecoctionAmount = (
    powderAmount: number,
    decoctionEquivalentPerG: number,
    concentrationRatio: number
  ): number => {
    // 飲片量 (g) = (藥粉量 (g) ÷ concentration_ratio) × decoction_equivalent_per_g
    return (powderAmount / concentrationRatio) * decoctionEquivalentPerG;
  };

  // 處理藥材藥粉量輸入（計算飲片量與價格）
  const handlePowderAmountChange = (id: string, amount: string) => {
    setPrescription(prev => ({
      ...prev,
      herbs: prev.herbs.map(herb => {
        if (herb.id === id) {
          const numAmount = parseFloat(amount) || 0;
          let decoctionAmount = '';
          let totalPrice = 0;

          if (numAmount > 0) {
            // 計算飲片量
            const decoctionValue = calculateDecoctionAmount(
              numAmount,
              herb.decoction_equivalent_per_g,
              herb.concentration_ratio
            );
            decoctionAmount = decoctionValue.toFixed(1);

            // 計算價格 - 確保使用有效的價格
            totalPrice = numAmount * (herb.price_per_gram || 0);
          }

          return {
            ...herb,
            powder_amount: amount,
            decoction_amount: decoctionAmount,
            total_price: totalPrice
          };
        }
        return herb;
      })
    }));
  };

  // 處理飲片量輸入（計算藥粉量與價格）
  const handleDecoctionAmountChange = (id: string, amount: string) => {
    setPrescription(prev => ({
      ...prev,
      herbs: prev.herbs.map(herb => {
        if (herb.id === id) {
          const numAmount = parseFloat(amount) || 0;
          let powderAmount = '';
          let totalPrice = 0;

          if (numAmount > 0) {
            // 計算藥粉量
            const powderValue = calculatePowderAmount(
              numAmount,
              herb.decoction_equivalent_per_g,
              herb.concentration_ratio
            );
            powderAmount = powderValue.toFixed(1);

            // 計算價格 - 確保使用有效的價格
            totalPrice = powderValue * (herb.price_per_gram || 0);
          }

          return {
            ...herb,
            decoction_amount: amount,
            powder_amount: powderAmount,
            total_price: totalPrice
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

  // 處理結構化服法參數變更
  const handleStructuredInstructionsChange = (field: keyof StructuredInstructions, value: string | number) => {
    // 處理數值轉換，確保為整數
    const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;

    setPrescription(prev => ({
      ...prev,
      structured_instructions: {
        ...prev.structured_instructions,
        [field]: numValue
      },
      // 同時更新傳統格式的服法說明
      instructions: `共${numValue}天，每日${prev.structured_instructions.times_per_day}次，${prev.structured_instructions.timing}`
    }));
  };

  // 處理結構化服法文本變更（如「早晚服」）
  const handleTimingChange = (value: string) => {
    setPrescription(prev => ({
      ...prev,
      structured_instructions: {
        ...prev.structured_instructions,
        timing: value
      },
      // 同時更新傳統格式的服法說明
      instructions: `共${prev.structured_instructions.total_days}天，每日${prev.structured_instructions.times_per_day}次，${value}`
    }));
  };

  const processPrescriptionData = () => {
    return {
      herbs: prescription.herbs.map(herb => ({
        id: herb.id,
        code: herb.code,
        name: herb.name,
        brand: herb.brand,
        powder_amount: herb.powder_amount,
        decoction_amount: herb.decoction_amount,
        price_per_gram: herb.price_per_gram,
        total_price: herb.total_price,
        unit: herb.unit,
        is_compound: herb.is_compound,
        concentration_ratio: herb.concentration_ratio,
        decoction_equivalent_per_g: herb.decoction_equivalent_per_g,
        inventory_status: herb.inventory_status,
        source: herb.source,
        ingredients: herb.ingredients
      })),
      instructions: prescription.instructions,
      structured_instructions: prescription.structured_instructions,
      total_price: prescription.total_price,
      per_dose_price: prescription.per_dose_price
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(processPrescriptionData());
  };

  // 使用 useImperativeHandle 暴露方法給父組件
  useImperativeHandle(ref, () => ({
    // 添加藥材方法
    addHerb: (herbData: any) => {
      // 檢查藥材是否已存在於處方中
      const exists = prescription.herbs.some(herb =>
        herb.code === herbData.code || herb.name === herbData.name
      );

      if (exists) {
        alert(`處方中已存在相同藥材：${herbData.name}`);
        return;
      }

      // 添加新藥材
      const newHerb: HerbItem = {
        id: Date.now().toString(),
        code: herbData.code || '',
        name: herbData.name || '',
        brand: herbData.brand || '',
        powder_amount: herbData.amount || '3',
        decoction_amount: '',
        price_per_gram: herbData.price_per_gram || 0,
        total_price: (parseFloat(herbData.amount || '3') * (herbData.price_per_gram || 0)) || 0,
        unit: 'g',
        is_compound: false,
        concentration_ratio: herbData.concentration_ratio || 1,
        decoction_equivalent_per_g: herbData.decoction_equivalent_per_g || 1,
        inventory_status: InventoryStatus.UNKNOWN,
        source: herbData.source || 'AI_suggested'
      };

      setPrescription(prev => ({
        ...prev,
        herbs: [...prev.herbs, newHerb]
      }));
    },

    // 重置表單方法
    resetForm: () => {
      console.log('重置中藥處方表單');
      setPrescription({
        ...defaultPrescription,
        herbs: [createEmptyHerbItem()]
      });
    }
  }));

  // 將藥物項目轉換為 AsyncSelect 選項
  const getSelectedOption = (herb: HerbItem): SelectOption[] => {
    if (!herb.name || !herb.code) {
      return [];
    }

    return [{
      label: `${herb.name} - ${herb.brand || '未知品牌'}`,
      value: herb.code,
      data: herb
    }];
  };

  // 獲取庫存狀態的樣式
  const getInventoryStatusStyle = (status: InventoryStatus) => {
    switch (status) {
      case InventoryStatus.NORMAL:
        return 'bg-green-100 text-green-800';
      case InventoryStatus.LOW:
        return 'bg-yellow-100 text-yellow-800';
      case InventoryStatus.OUT_OF_STOCK:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 獲取庫存狀態的文字
  const getInventoryStatusText = (status: InventoryStatus) => {
    switch (status) {
      case InventoryStatus.NORMAL:
        return '庫存正常';
      case InventoryStatus.LOW:
        return '庫存偏低';
      case InventoryStatus.OUT_OF_STOCK:
        return '庫存不足';
      default:
        return '庫存狀態未知';
    }
  };

  const handleSaveTemplate = () => {
    try {
      if (prescription.herbs.length === 0) {
        alert('處方中沒有藥材，無法儲存模板');
        return;
      }

      // 提示用戶輸入模板名稱
      const templateName = prompt('請輸入處方模板名稱:');
      if (!templateName) {
        return;
      }

      // 獲取現有模板
      const existingTemplatesJson = localStorage.getItem('prescription_templates');
      const existingTemplates = existingTemplatesJson ? JSON.parse(existingTemplatesJson) : [];

      // 添加新模板
      const newTemplate = {
        id: Date.now().toString(),
        name: templateName,
        herbs: prescription.herbs,
        instructions: prescription.instructions,
        structured_instructions: prescription.structured_instructions,
        created_at: new Date().toISOString()
      };

      // 保存更新後的模板列表
      localStorage.setItem('prescription_templates', JSON.stringify([...existingTemplates, newTemplate]));
      alert('處方模板儲存成功');
    } catch (error) {
      console.error('儲存處方模板失敗:', error);
      alert('儲存處方模板失敗');
    }
  };

  const handleLoadTemplate = () => {
    try {
      // 獲取現有模板
      const existingTemplatesJson = localStorage.getItem('prescription_templates');
      if (!existingTemplatesJson) {
        alert('沒有儲存的處方模板');
        return;
      }

      const templates = JSON.parse(existingTemplatesJson);
      if (templates.length === 0) {
        alert('沒有儲存的處方模板');
        return;
      }

      // 簡單實現：顯示一個選擇列表
      const templateNames = templates.map((t: any, index: number) => `${index + 1}. ${t.name}`).join('\n');
      const selectedIndex = parseInt(prompt(`請選擇要載入的模板號碼:\n${templateNames}`) || '0') - 1;

      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= templates.length) {
        alert('選擇無效');
        return;
      }

      // 載入選擇的模板
      const selectedTemplate = templates[selectedIndex];
      setPrescription({
        herbs: selectedTemplate.herbs,
        instructions: selectedTemplate.instructions,
        structured_instructions: selectedTemplate.structured_instructions,
        total_price: selectedTemplate.herbs.reduce((sum: number, herb: any) => sum + herb.total_price, 0),
        per_dose_price: selectedTemplate.herbs.reduce((sum: number, herb: any) => sum + herb.total_price, 0) /
          (selectedTemplate.structured_instructions.total_days * selectedTemplate.structured_instructions.times_per_day)
      });

      alert('處方模板載入成功');
    } catch (error) {
      console.error('載入處方模板失敗:', error);
      alert('載入處方模板失敗');
    }
  };

  return (
    <div className="bg-white p-4 rounded-md shadow">
      <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">中藥處方</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 藥材列表 */}
        <div className="border rounded-md overflow-hidden shadow-sm">
          {/* 表頭 */}
          <div className="grid grid-cols-12 bg-gray-100 p-2 border-b font-medium text-sm">
            <div className="col-span-3">中藥名稱</div>
            <div className="col-span-2">藥粉量 (g)</div>
            <div className="col-span-2">飲片量 (g)</div>
            <div className="col-span-2">品牌/規格</div>
            <div className="col-span-1 text-right pr-2">單價 ($/g)</div>
            <div className="col-span-1 text-right pr-2">小計 ($)</div>
            <div className="col-span-1 text-center">操作</div>
          </div>

          {/* 藥材行 */}
          <div className="divide-y">
            {prescription.herbs.map((herb, index) => {
              const isAiSuggested = herb.source === 'AI_suggested';
              const inventoryStatusClass = getInventoryStatusStyle(herb.inventory_status);
              const inventoryStatusText = getInventoryStatusText(herb.inventory_status);

              // 為不同品牌設置背景色以區分
              let brandBackground = '';
              if (herb.brand) {
                if (herb.brand.toLowerCase().includes('漢方')) {
                  brandBackground = 'bg-blue-50';
                } else if (herb.brand.toLowerCase().includes('海天')) {
                  brandBackground = 'bg-green-50';
                } else if (herb.brand.toLowerCase().includes('香港中文大學')) {
                  brandBackground = 'bg-yellow-50';
                }
              }

              // 為空藥材行添加不同的提示文字
              const isEmpty = !herb.name || !herb.code;
              const placeholderText = isEmpty ? "搜尋並選擇藥材" : "搜尋中藥名稱";

              return (
                <div
                  key={herb.id}
                  className={`grid grid-cols-12 p-2 items-center text-sm ${isAiSuggested ? 'bg-green-50' : brandBackground}`}
                >
                  <div className="col-span-3 pr-2 relative">
                    {isAiSuggested && (
                      <span className="absolute -left-1 -top-1 z-10 text-xs bg-green-500 text-white px-1 py-0.5 rounded-full">AI</span>
                    )}
                    <AsyncSelect
                      placeholder={placeholderText}
                      loadOptions={searchMedicines}
                      onChange={(selectedItems) => handleHerbSelection(herb.id, selectedItems)}
                      value={getSelectedOption(herb)}
                      multiple={false}
                      className="w-full"
                      disabled={false}
                    />

                    {/* 複方成分顯示 */}
                    {herb.is_compound && herb.ingredients && herb.ingredients.length > 0 && (
                      <div className="mt-1 p-1 bg-gray-50 text-xs rounded-md">
                        <div className="font-medium text-gray-700">複方成分:</div>
                        <ul className="list-disc pl-3">
                          {herb.ingredients.map((ingredient, idx) => (
                            <li key={idx}>
                              {ingredient.name} {ingredient.amount}g
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 pr-2">
                    <input
                      type="text"
                      value={herb.powder_amount}
                      onChange={(e) => handlePowderAmountChange(herb.id, e.target.value)}
                      placeholder="藥粉量"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      disabled={isEmpty}
                    />
                  </div>

                  <div className="col-span-2 pr-2">
                    <input
                      type="text"
                      value={herb.decoction_amount}
                      onChange={(e) => handleDecoctionAmountChange(herb.id, e.target.value)}
                      placeholder="飲片量"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      disabled={isEmpty}
                    />
                  </div>

                  <div className="col-span-2 pr-2 text-xs">
                    <div className="flex flex-col">
                      {herb.brand ? (
                        <div className="flex items-center">
                          <span className="font-medium">{herb.brand}</span>
                          {herb.brand.toLowerCase().includes('漢方') &&
                            <span className="ml-1 px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">漢方</span>
                          }
                          {herb.brand.toLowerCase().includes('海天') &&
                            <span className="ml-1 px-1 py-0.5 text-xs bg-green-100 text-green-800 rounded">海天</span>
                          }
                        </div>
                      ) : (
                        <span className="font-medium text-gray-500">未知品牌</span>
                      )}
                      {!isEmpty && (
                        <>
                          <span className="text-gray-500">濃縮比: {herb.concentration_ratio}:1</span>
                          <span className={`mt-1 px-1.5 py-0.5 rounded-full text-center ${inventoryStatusClass}`}>
                            {inventoryStatusText}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="col-span-1 pr-2 text-right font-medium">
                    {(herb.price_per_gram || 0).toFixed(2)}
                  </div>

                  <div className="col-span-1 pr-2 text-right font-medium">
                    {(herb.total_price || 0).toFixed(2)}
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveHerb(herb.id)}
                      className="text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100"
                      title="刪除此藥材"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 新增按鈕 */}
          <div className="p-3 bg-gray-50 flex justify-center">
            <button
              type="button"
              onClick={handleAddHerb}
              className="px-4 py-1.5 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md shadow-sm flex items-center"
            >
              <span className="mr-1 font-bold">+</span> 新增藥材
            </button>
          </div>
        </div>

        {/* 服法說明 - 改為結構化欄位 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">服法</label>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center">
              <span className="mr-2">共</span>
              <select
                value={prescription.structured_instructions.total_days}
                onChange={(e) => handleStructuredInstructionsChange('total_days', e.target.value)}
                className="p-1.5 border border-gray-300 rounded-md w-16 text-center"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 21, 28].map(days => (
                  <option key={days} value={days}>{days}</option>
                ))}
              </select>
              <span className="ml-2">天</span>
            </div>

            <div className="flex items-center">
              <span className="mr-2">每日</span>
              <select
                value={prescription.structured_instructions.times_per_day}
                onChange={(e) => handleStructuredInstructionsChange('times_per_day', e.target.value)}
                className="p-1.5 border border-gray-300 rounded-md w-16 text-center"
              >
                {[1, 2, 3, 4].map(times => (
                  <option key={times} value={times}>{times}</option>
                ))}
              </select>
              <span className="ml-2">次</span>
            </div>

            <div className="flex items-center">
              <select
                value={prescription.structured_instructions.timing}
                onChange={(e) => handleTimingChange(e.target.value)}
                className="p-1.5 border border-gray-300 rounded-md"
              >
                <option value="早晚服">早晚服</option>
                <option value="午晚服">午晚服</option>
                <option value="三餐服">三餐服</option>
                <option value="早中晚服">早中晚服</option>
                <option value="睡前服">睡前服</option>
                <option value="飯前服">飯前服</option>
                <option value="飯後服">飯後服</option>
                <option value="自行安排">自行安排</option>
              </select>
            </div>
          </div>
          <input
            type="text"
            value={prescription.instructions}
            onChange={(e) => handleInstructionsChange(e.target.value)}
            placeholder="自定義服法說明"
            className="w-full p-2 border border-gray-300 rounded-md mt-2"
          />
        </div>

        {/* 處方總價與操作按鈕 */}
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
            <div className="text-right p-2 bg-blue-50 rounded-md space-y-1">
              <p className="text-sm font-medium text-blue-600">
                每服處方價錢: <span>{prescription.per_dose_price.toFixed(2)} HKD</span>
              </p>
              <p className="text-xl font-bold text-blue-700">
                處方總價: <span>{prescription.total_price.toFixed(2)} HKD</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-2">
          <button
            type="button"
            onClick={handleSaveTemplate}
            className="text-sm text-blue-600 hover:underline"
          >
            儲存為處方模板
          </button>
          <button
            type="button"
            onClick={handleLoadTemplate}
            className="text-sm text-blue-600 hover:underline"
          >
            載入處方模板
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 shadow-sm"
          >
            儲存處方
          </button>
        </div>
      </form>
    </div>
  );
});

HerbalPrescriptionForm.displayName = 'HerbalPrescriptionForm';

export default HerbalPrescriptionForm; 