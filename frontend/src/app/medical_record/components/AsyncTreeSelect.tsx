import { debounce } from 'lodash';
import TreeSelect from 'rc-tree-select';
import 'rc-tree-select/assets/index.css';
import React, { useCallback, useEffect, useState } from 'react';

export interface TreeNode {
  label: string;
  value: string;
  children?: TreeNode[];
  isLeaf?: boolean;
}

interface AsyncTreeSelectProps {
  placeholder: string;
  onChange: (value: string[]) => void;
  onSelect?: (value: string, node: TreeNode) => void;
  loadData: (searchTerm: string) => Promise<TreeNode[]>;
  value?: string[];
  defaultValue?: string[];
  className?: string;
  multiple?: boolean;
  allowClear?: boolean;
  treeDefaultExpandAll?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

const AsyncTreeSelect: React.FC<AsyncTreeSelectProps> = ({
  placeholder,
  onChange,
  onSelect,
  loadData,
  value,
  defaultValue,
  className = '',
  multiple = true,
  allowClear = true,
  treeDefaultExpandAll = false,
  disabled = false,
  loading = false
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 使用 debounce 來延遲搜尋請求
  const debouncedLoadData = useCallback(
    debounce(async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 2) {
        return;
      }
      
      setIsLoading(true);
      try {
        const data = await loadData(searchTerm);
        setTreeData(data);
      } catch (error) {
        console.error('搜尋資料失敗:', error);
        setTreeData([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [loadData]
  );

  // 處理輸入變化
  const handleInputChange = (value: string) => {
    setSearchValue(value);
    debouncedLoadData(value);
  };

  // 處理選擇變化
  const handleChange = (value: any) => {
    if (Array.isArray(value)) {
      onChange(value);
    } else {
      onChange([value]);
    }
  };

  // 處理選擇事件
  const handleSelect = (value: any, node: any) => {
    if (onSelect) {
      onSelect(value, node);
    }
  };

  // 清除搜尋防止記憶體洩漏
  useEffect(() => {
    return () => {
      debouncedLoadData.cancel();
    };
  }, [debouncedLoadData]);

  return (
    <div className={`w-full ${className}`}>
      <TreeSelect
        prefixCls="rc-tree-select"
        showSearch
        multiple={multiple}
        treeData={treeData}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        searchValue={searchValue}
        onSearch={handleInputChange}
        onChange={handleChange}
        onSelect={handleSelect}
        treeDefaultExpandAll={treeDefaultExpandAll}
        allowClear={allowClear}
        disabled={disabled || isLoading || loading}
        loading={isLoading || loading}
        treeNodeFilterProp="label"
        className="w-full p-2 border border-gray-300 rounded-md"
        style={{ width: '100%' }}
        notFoundContent={isLoading ? "搜尋中..." : "無符合結果"}
      />
    </div>
  );
};

export default AsyncTreeSelect; 