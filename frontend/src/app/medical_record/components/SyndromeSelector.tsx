import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDownIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

// 定義證候資料結構
interface SyndromeItem {
  label: string; // 顯示名稱
  value: string; // 代碼
}

interface SyndromeTreeNode {
  code: string;
  name: string;
  children: SyndromeTreeNode[];
}

interface SyndromeSelectorProps {
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
  placeholder?: string;
  className?: string;
  showTreeView?: boolean;
}

// 檢測循環引用
function findCircularReferences(parentChildMap: Record<string, string[]>): string[] {
  const circularRefs: string[] = [];
  
  // 檢查自引用
  Object.entries(parentChildMap).forEach(([parent, children]) => {
    if (children.includes(parent)) {
      circularRefs.push(parent);
    }
  });
  
  return circularRefs;
}

// 移除循環引用
function removeCircularReferences(
  parentChildMap: Record<string, string[]>, 
  circularRefs: string[]
): Record<string, string[]> {
  const cleanedMap = {...parentChildMap};
  
  // 移除自引用
  circularRefs.forEach(ref => {
    if (cleanedMap[ref]) {
      cleanedMap[ref] = cleanedMap[ref].filter(child => child !== ref);
    }
  });
  
  return cleanedMap;
}

const SyndromeSelector: React.FC<SyndromeSelectorProps> = ({
  selectedCodes = [],
  onChange,
  placeholder = '請選擇中醫辨證',
  className = '',
  showTreeView = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<SyndromeItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [treeViewMode, setTreeViewMode] = useState(showTreeView);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [syndromeAutocompleteList, setSyndromeAutocompleteList] = useState<string[]>([]);
  const [syndromeCodeMapping, setSyndromeCodeMapping] = useState<Record<string, string>>({});
  const [parentToChildren, setParentToChildren] = useState<Record<string, string[]>>({});
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 確保數據加載完成
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      try {
        // 這裡重新加載數據以確保在組件內部可用
        // 自動完成列表
        const autocompleteResponse = await fetch('/data/cm_syndrime_autocomplete_list.json');
        if (autocompleteResponse.ok) {
          const autocompleteData = await autocompleteResponse.json();
          setSyndromeAutocompleteList(autocompleteData);
          console.log('自動完成列表加載成功，項目數:', autocompleteData.length);
        }

        // 代碼映射
        const codeMapResponse = await fetch('/data/cm_syndrime_syndrome_code_mapping.json');
        if (codeMapResponse.ok) {
          const codeMapData = await codeMapResponse.json();
          setSyndromeCodeMapping(codeMapData);
          console.log('代碼映射加載成功，項目數:', Object.keys(codeMapData).length);
        }

        // 父子關係
        const parentChildrenResponse = await fetch('/data/cm_syndrime_parent_to_children.json');
        if (parentChildrenResponse.ok) {
          let parentChildData = await parentChildrenResponse.json();
          console.log('父子關係加載成功，項目數:', Object.keys(parentChildData).length);
          
          // 檢查並修復循環引用問題
          const circularRefs = findCircularReferences(parentChildData);
          if (circularRefs.length > 0) {
            console.warn('檢測到循環引用，正在移除:', circularRefs);
            parentChildData = removeCircularReferences(parentChildData, circularRefs);
          }
          setParentToChildren(parentChildData);
        }
      } catch (error) {
        console.error('載入證候資料時出錯:', error);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadData();
  }, []);

  // 將代碼轉換為名稱的反向映射
  const codeToName = useMemo(() => {
    const mapping: Record<string, string> = {};
    
    try {
      // 直接從映射中獲取配對關係
      Object.entries(syndromeCodeMapping).forEach(([name, code]) => {
        if (typeof code === 'string') {
          mapping[code] = name;
        }
      });
      
      // 驗證映射是否成功生成
      const keysCount = Object.keys(mapping).length;
      console.log(`證候代碼到名稱映射成功，共 ${keysCount} 個項目`);
      
      // 如果沒有映射成功，嘗試打印一些調試信息
      if (keysCount === 0) {
        console.error('ERROR: 證候代碼映射為空，原始映射對象：', syndromeCodeMapping);
      } else {
        // 打印前5個作為示例
        const examples = Object.entries(mapping).slice(0, 5);
        console.log('證候代碼映射示例：', examples);
      }
    } catch (error) {
      console.error('建立證候代碼到名稱映射時出錯:', error);
    }
    
    return mapping;
  }, [syndromeCodeMapping]);

  // 建立樹狀結構
  const buildTree = useMemo((): SyndromeTreeNode[] => {
    const rootCodes = Object.keys(parentToChildren).filter(code => 
      !Object.values(parentToChildren).flat().includes(code) || code.endsWith('.')
    );
    
    const buildSubtree = (code: string, visitedCodes: Set<string> = new Set()): SyndromeTreeNode => {
      // 防止循環引用
      if (visitedCodes.has(code)) {
        console.warn(`檢測到循環引用: ${code} 已在訪問路徑中`);
        return { code, name: codeToName[code] || code, children: [] };
      }
      
      // 添加當前節點到已訪問集合
      const newVisited = new Set(visitedCodes);
      newVisited.add(code);
      
      const name = codeToName[code] || code;
      // 最大深度控制，避免過深的遞迴
      const maxDepth = 10;
      if (newVisited.size > maxDepth) {
        console.warn(`達到最大深度限制 ${maxDepth} 層: ${code}`);
        return { code, name, children: [] };
      }
      
      // 獲取子節點，確保子節點不包含自身以防止自引用
      const childCodes = (parentToChildren[code] || []).filter(childCode => childCode !== code);
      const children = childCodes.map(childCode => buildSubtree(childCode, newVisited));
      
      return { code, name, children };
    };
    
    try {
      return rootCodes.map(code => buildSubtree(code));
    } catch (error) {
      console.error('建立證候樹狀結構時出錯:', error);
      return []; // 出錯時返回空數組，避免崩潰
    }
  }, [codeToName, parentToChildren]);

  // 當輸入值改變時過濾選項
  useEffect(() => {
    if (inputValue.trim() === '') {
      setFilteredOptions([]);
    } else {
      const filtered = syndromeAutocompleteList
        .filter(name => name.toLowerCase().includes(inputValue.toLowerCase()))
        .map(name => ({
          label: name,
          value: syndromeCodeMapping[name] || ''
        }))
        .filter(item => item.value !== ''); // 確保有對應的代碼
      
      setFilteredOptions(filtered);
    }
  }, [inputValue, syndromeAutocompleteList, syndromeCodeMapping]);

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
  };

  const handleSelect = (item: SyndromeItem) => {
    if (!selectedCodes.includes(item.value)) {
      onChange([...selectedCodes, item.value]);
    }
    setInputValue('');
    setIsOpen(false);
  };

  const handleRemove = (code: string) => {
    onChange(selectedCodes.filter(c => c !== code));
  };

  const toggleTreeNode = (code: string) => {
    const newExpandedNodes = new Set(expandedNodes);
    if (newExpandedNodes.has(code)) {
      newExpandedNodes.delete(code);
    } else {
      newExpandedNodes.add(code);
    }
    setExpandedNodes(newExpandedNodes);
  };

  const renderTreeNodes = (nodes: SyndromeTreeNode[], level = 0) => {
    return nodes.map(node => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes.has(node.code);
      const isSelected = selectedCodes.includes(node.code);
      
      return (
        <div key={node.code} style={{ marginLeft: `${level * 16}px` }}>
          <div className="flex items-center py-1">
            {hasChildren ? (
              <button
                onClick={() => toggleTreeNode(node.code)}
                className="p-1 hover:bg-gray-100 rounded mr-1"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6"></div>
            )}
            <div 
              onClick={() => {
                if (!isSelected) {
                  onChange([...selectedCodes, node.code]);
                }
              }}
              className={`flex-grow px-2 py-1 cursor-pointer rounded ${
                isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
            >
              {node.name}
            </div>
          </div>
          {hasChildren && isExpanded && renderTreeNodes(node.children, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="relative w-full">
      {/* 模式切換按鈕 */}
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setTreeViewMode(!treeViewMode)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          切換至{treeViewMode ? '搜尋' : '分類瀏覽'}模式
        </button>
      </div>

      {/* 搜尋模式 */}
      {!treeViewMode && (
        <>
          {/* 輸入框與選定項目 */}
          <div className={`flex flex-wrap items-center border rounded-md ${className}`}>
            {selectedCodes.map((code, index) => (
              <div 
                key={`${code}-${index}`} 
                className="flex items-center m-1 px-2 py-1 bg-blue-100 rounded-md"
              >
                <span className="mr-1">{codeToName[code] || code}</span>
                <button 
                  type="button" 
                  onClick={() => handleRemove(code)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={selectedCodes.length > 0 ? '' : placeholder}
              className={`flex-grow p-2 outline-none min-w-[100px]`}
              onFocus={() => inputValue && setIsOpen(true)}
            />
          </div>

          {/* 下拉選單 */}
          {isOpen && filteredOptions.length > 0 && (
            <div 
              ref={dropdownRef}
              className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md max-h-60 overflow-y-auto"
            >
              {filteredOptions.map((option, index) => (
                <div
                  key={`${option.value}-${index}`}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 樹狀瀏覽模式 */}
      {treeViewMode && (
        <div className="border rounded-md p-2 max-h-96 overflow-y-auto">
          {/* 已選項目顯示 */}
          {selectedCodes.length > 0 && (
            <div className="mb-4 pb-2 border-b">
              <div className="text-sm font-medium mb-1">已選項目:</div>
              <div className="flex flex-wrap gap-1">
                {selectedCodes.map((code) => (
                  <div 
                    key={code} 
                    className="flex items-center px-2 py-1 bg-blue-100 rounded-md"
                  >
                    <span className="mr-1">{codeToName[code] || code}</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemove(code)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 樹狀結構 */}
          <div className="text-sm">
            {isDataLoading ? (
              <div className="flex justify-center items-center p-4">
                <div className="animate-pulse flex space-x-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                </div>
                <span className="ml-2 text-gray-500">正在載入證候資料...</span>
              </div>
            ) : buildTree.length > 0 ? (
              renderTreeNodes(buildTree)
            ) : (
              <div className="text-center p-4 text-red-500">
                <p>無法載入證候數據</p>
                <p className="text-gray-500 text-sm mt-2">請檢查網絡連接或重新整理頁面</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SyndromeSelector; 