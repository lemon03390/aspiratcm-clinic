import { debounce } from 'lodash';
import TreeSelect from 'rc-tree-select';
import React, { useCallback, useEffect, useState } from 'react';
import '../../../styles/AsyncTreeSelectStyles.css';

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
  treeData?: TreeNode[];
  minSearchCharacters?: number;
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
  loading = false,
  treeData: providedTreeData,
  minSearchCharacters = 2
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>(providedTreeData || []);
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const debouncedLoadData = useCallback(
    debounce(async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < minSearchCharacters) {
        if (providedTreeData && providedTreeData.length > 0) {
          setTreeData(providedTreeData);
        }
        return;
      }

      setIsLoading(true);
      try {
        const data = await loadData(searchTerm);
        if (data && data.length > 0) {
          console.log('搜尋到資料:', data.length, '筆');
          setTreeData(data);
        } else {
          console.log('搜尋無結果');
          if (providedTreeData && providedTreeData.length > 0) {
            setTreeData(providedTreeData);
          }
        }
      } catch (error) {
        console.error('搜尋資料失敗:', error);
        if (providedTreeData && providedTreeData.length > 0) {
          setTreeData(providedTreeData);
        } else {
          setTreeData([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [loadData, providedTreeData, minSearchCharacters]
  );

  const handleInputChange = (value: string) => {
    console.log('輸入變化:', value);
    setSearchValue(value);

    if (!value && providedTreeData) {
      setTreeData(providedTreeData);
      return;
    }

    debouncedLoadData(value);
  };

  const handleChange = (value: any) => {
    console.log('選擇變化:', value);
    if (Array.isArray(value)) {
      onChange(value);
    } else if (value) {
      onChange([value]);
    } else {
      onChange([]);
    }
  };

  const handleSelect = (value: any, node: any) => {
    console.log('選擇事件:', value, node);
    if (onSelect) {
      onSelect(value, node);
    }
  };

  useEffect(() => {
    if (providedTreeData) {
      console.log('更新樹狀資料:', providedTreeData.length, '筆');
      setTreeData(providedTreeData);
    }
  }, [providedTreeData]);

  useEffect(() => {
    return () => {
      debouncedLoadData.cancel();
    };
  }, [debouncedLoadData]);

  const getNotFoundContent = () => {
    if (isLoading) {
      return "搜尋中...";
    }

    if (searchValue && searchValue.length < minSearchCharacters) {
      return `請輸入至少 ${minSearchCharacters} 個字符`;
    }

    return "無符合結果";
  };

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
        notFoundContent={getNotFoundContent()}
        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
        filterTreeNode={(input, treeNode) => {
          if (input.length < minSearchCharacters) {
            return true;
          }

          return (treeNode?.title?.toString().toLowerCase() || '').includes(input.toLowerCase()) ||
            (treeNode?.label?.toString().toLowerCase() || '').includes(input.toLowerCase());
        }}
        showTreeIcon={true}
        treeExpandedKeys={treeDefaultExpandAll ? treeData.map(node => node.value) : undefined}
      />
    </div>
  );
};

export default AsyncTreeSelect; 