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

// 載入證候資料
let syndromeAutocompleteList: string[] = [];
let syndromeCodeMapping: Record<string, string> = {}; // 名稱 -> 代碼
let parentToChildren: Record<string, string[]> = {};

// 非同步載入資料
async function loadSyndromeData() {
  try {
    // 自動完成列表
    const autocompleteResponse = await fetch('/data/cm_syndrime_autocomplete_list.json');
    if (autocompleteResponse.ok) {
      syndromeAutocompleteList = await autocompleteResponse.json();
    }

    // 代碼映射
    const codeMapResponse = await fetch('/data/cm_syndrime_syndrome_code_mapping.json');
    if (codeMapResponse.ok) {
      syndromeCodeMapping = await codeMapResponse.json();
    }

    // 父子關係
    const parentChildrenResponse = await fetch('/data/cm_syndrime_parent_to_children.json');
    if (parentChildrenResponse.ok) {
      parentToChildren = await parentChildrenResponse.json();
    }
  } catch (error) {
    console.error('載入證候資料時出錯:', error);
  }
}

// 確保在組件渲染前載入資料
loadSyndromeData();

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
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 將代碼轉換為名稱的反向映射
  const codeToName = useMemo(() => {
    const mapping: Record<string, string> = {};
    Object.entries(syndromeCodeMapping).forEach(([name, code]) => {
      mapping[code] = name;
    });
    return mapping;
  }, []);

  // 建立樹狀結構
  const buildTree = useMemo((): SyndromeTreeNode[] => {
    const rootCodes = Object.keys(parentToChildren).filter(code => 
      !Object.values(parentToChildren).flat().includes(code) || code.endsWith('.')
    );
    
    const buildSubtree = (code: string): SyndromeTreeNode => {
      const name = codeToName[code] || code;
      const children = (parentToChildren[code] || []).map(childCode => buildSubtree(childCode));
      return { code, name, children };
    };
    
    return rootCodes.map(code => buildSubtree(code));
  }, [codeToName]);

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
  }, [inputValue]);

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
            {renderTreeNodes(buildTree)}
          </div>
        </div>
      )}
    </div>
  );
};

export default SyndromeSelector; 