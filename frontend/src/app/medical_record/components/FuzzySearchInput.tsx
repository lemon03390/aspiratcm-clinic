import React, { useState, useEffect, useRef } from 'react';

interface FuzzySearchInputProps {
  options: string[];
  placeholder: string;
  onSelect: (selected: string) => void;
  value?: string;
  className?: string;
  multiple?: boolean;
  selectedItems?: string[];
  onRemove?: (item: string) => void;
}

const FuzzySearchInput: React.FC<FuzzySearchInputProps> = ({
  options,
  placeholder,
  onSelect,
  value = '',
  className = '',
  multiple = false,
  selectedItems = [],
  onRemove
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 過濾選項
  useEffect(() => {
    if (inputValue.trim() === '') {
      setFilteredOptions([]);
    } else {
      const filtered = options.filter(option => 
        option.toLowerCase().includes(inputValue.toLowerCase()));
      setFilteredOptions(filtered);
    }
  }, [inputValue, options]);

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

  const handleSelect = (option: string) => {
    if (multiple) {
      if (!selectedItems.includes(option)) {
        onSelect(option);
      }
      setInputValue('');
    } else {
      setInputValue(option);
      onSelect(option);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      {/* 輸入框 */}
      <div className={`flex flex-wrap items-center border rounded-md ${className}`}>
        {multiple && selectedItems.map((item, index) => (
          <div 
            key={`${item}-${index}`} 
            className="flex items-center m-1 px-2 py-1 bg-blue-100 rounded-md"
          >
            <span className="mr-1">{item}</span>
            <button 
              type="button" 
              onClick={() => onRemove && onRemove(item)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={multiple && selectedItems.length > 0 ? '' : placeholder}
          className={`flex-grow p-2 outline-none ${multiple ? 'min-w-[100px]' : 'w-full'}`}
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
              key={`${option}-${index}`}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelect(option)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FuzzySearchInput; 