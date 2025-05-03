"use client";

import axios from 'axios';
import { useEffect, useState } from 'react';
import { getBackendUrl } from '../../../libs/apiClient';

// 自定義圖標組件替代 heroicons
const ChevronDownIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronRightIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const PlusIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const PencilIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const TrashIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ArrowDownTrayIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ArrowUpTrayIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

// 設定類別定義
const CATEGORIES = [
  { key: 'modern_chinese_disease_name', title: '現代病名', description: '現代疾病名稱對照表' },
  { key: 'cm_syndrome', title: '中醫辨證', description: '中醫辨證分類及描述' },
  { key: 'tcm_treatment_rule', title: '中醫治則', description: '中醫治療原則' },
  { key: 'tcm_treatment_method', title: '中醫療法', description: '中醫治療方法' },
  { key: 'tcm_single_herb', title: '中藥資料', description: '中藥單方資料庫' },
  { key: 'referral_source', title: '介紹人選項', description: '設定可選擇的介紹人來源列表' }
];

// 設定項類型定義
interface TcmSetting {
  id: number;
  code?: string;
  category: string;
  name: string;
  aliases?: string;
  parent_id?: number;
}

// 新增設定表單類型
interface SettingForm {
  category: string;
  name: string;
  aliases: string;
  parent_id?: number;
}

// TCM參考資料管理頁面組件
export default function TcmSettingsPage() {
  // 狀態設定
  const [activeCategory, setActiveCategory] = useState<string>('modern_chinese_disease_name');
  const [settings, setSettings] = useState<TcmSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<TcmSetting | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['modern_chinese_disease_name']));
  const [confirmDelete, setConfirmDelete] = useState<{ visible: boolean, id: number | null }>({ visible: false, id: null });
  const [form, setForm] = useState<SettingForm>({
    category: 'modern_chinese_disease_name',
    name: '',
    aliases: '',
  });

  // 載入指定類別的設定
  const fetchSettings = async (category: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`${getBackendUrl(`/settings/${category}`)}${searchText ? `?search=${searchText}` : ''}`);
      setSettings(response.data);
    } catch (error) {
      console.error('讀取設定失敗:', error);
      showToast('無法讀取設定資料', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 顯示通知提示
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-md z-50 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'
      } text-white transition-opacity duration-500`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 500);
    }, 3000);
  };

  // 當類別或搜尋條件變更時重新載入
  useEffect(() => {
    if (expandedCategories.has(activeCategory)) {
      fetchSettings(activeCategory);
    }
  }, [activeCategory, searchText, expandedCategories]);

  // 監聽URL hash變化，自動切換到指定類別
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');

      // 檢查是否有效的類別
      const isValidCategory = CATEGORIES.some(category => category.key === hash);

      if (isValidCategory) {
        // 設置活動類別
        setActiveCategory(hash);

        // 展開該類別
        setExpandedCategories(prev => {
          const newSet = new Set(prev);
          newSet.add(hash);
          return newSet;
        });

        // 滾動到該類別
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    };

    // 頁面載入時處理hash
    handleHashChange();

    // 監聽hash變化
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // 處理類別變更
  const handleCategoryChange = (key: string) => {
    setActiveCategory(key);
    setForm({ ...form, category: key });
  };

  // 處理折疊/展開類別
  const toggleCategory = (key: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
      handleCategoryChange(key);
    }
    setExpandedCategories(newExpanded);
  };

  // 處理搜尋
  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSearchText(formData.get('search') as string);
  };

  // 表單變更處理
  const handleFormChange = (key: string, value: any) => {
    setForm({ ...form, [key]: value });
  };

  // 新增/編輯設定
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name) {
      return showToast('名稱為必填項', 'error');
    }

    setLoading(true);
    try {
      if (editingRecord) {
        // 更新現有記錄
        await axios.put(`${getBackendUrl(`/settings/${activeCategory}`)}/${editingRecord.id}`, form);
        showToast('設定已更新');
      } else {
        // 新增記錄
        await axios.post(getBackendUrl(`/settings/${activeCategory}`), form);
        showToast('設定已新增');
      }

      // 重新載入設定資料
      fetchSettings(activeCategory);
      setIsModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('儲存設定失敗:', error);
      showToast('無法儲存設定', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 刪除設定
  const handleDelete = async (id: number) => {
    setConfirmDelete({ visible: true, id });
  };

  // 確認刪除
  const confirmDeleteAction = async () => {
    if (!confirmDelete.id) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${getBackendUrl(`/settings/${activeCategory}`)}/${confirmDelete.id}`);
      showToast('設定已刪除');
      fetchSettings(activeCategory);
    } catch (error) {
      console.error('刪除設定失敗:', error);
      showToast('無法刪除設定', 'error');
    } finally {
      setLoading(false);
      setConfirmDelete({ visible: false, id: null });
    }
  };

  // 開啟編輯模態
  const handleEdit = (record: TcmSetting) => {
    setEditingRecord(record);
    setForm({
      category: record.category,
      name: record.name,
      aliases: record.aliases || '',
      parent_id: record.parent_id
    });
    setIsModalVisible(true);
  };

  // 開啟新增模態
  const handleAdd = () => {
    resetForm();
    setIsModalVisible(true);
  };

  // 重置表單
  const resetForm = () => {
    setEditingRecord(null);
    setForm({
      category: activeCategory,
      name: '',
      aliases: '',
      parent_id: undefined
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex max-w-lg">
          <input
            type="search"
            name="search"
            placeholder="搜尋設定..."
            className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
          >
            搜尋
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {CATEGORIES.map(category => (
          <div key={category.key} id={category.key} className="border border-gray-200 rounded-md">
            <div
              className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleCategory(category.key)}
            >
              <div className="flex items-center">
                {expandedCategories.has(category.key) ? (
                  <ChevronDownIcon className="h-5 w-5 mr-2" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 mr-2" />
                )}
                <h2 className="text-xl font-medium">{category.title}</h2>
              </div>
              <button
                type="button"
                className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategoryChange(category.key);
                  handleAdd();
                }}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                新增{category.title}
              </button>
            </div>

            {expandedCategories.has(category.key) && (
              <div className="p-4 border-t border-gray-200">
                <div className="bg-white rounded-md shadow-sm">
                  <div className="p-4 border-b border-gray-200">
                    <p className="text-gray-700">{category.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-gray-500">總計: {settings.length} 筆資料</p>
                      <div className="flex space-x-2">
                        <button type="button" className="flex items-center px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50">
                          <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                          匯出 JSON
                        </button>
                        <button type="button" className="flex items-center px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50">
                          <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                          匯入 JSON
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="flex justify-center items-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                              代碼
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              名稱
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              別名
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {settings.map((setting) => (
                            <tr key={setting.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {setting.code || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {setting.name}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {setting.aliases ? (
                                  <div className="flex flex-wrap gap-1">
                                    {setting.aliases.split(',').map((alias, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                      >
                                        {alias.trim()}
                                      </span>
                                    ))}
                                  </div>
                                ) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => handleEdit(setting)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="編輯"
                                  >
                                    <PencilIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(setting.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="刪除"
                                  >
                                    <TrashIcon className="h-5 w-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}

                          {settings.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                                沒有資料
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 新增/編輯模態 */}
      {isModalVisible && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">{editingRecord ? '編輯設定' : '新增設定'}</h3>
              <button
                type="button"
                onClick={() => setIsModalVisible(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">關閉</span>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="輸入名稱（必填）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="aliases" className="block text-sm font-medium text-gray-700 mb-1">
                  別名（逗號分隔）
                </label>
                <input
                  id="aliases"
                  type="text"
                  value={form.aliases}
                  onChange={(e) => handleFormChange('aliases', e.target.value)}
                  placeholder="輸入別名，多個請用逗號分隔"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="parent_id" className="block text-sm font-medium text-gray-700 mb-1">
                  上級類別
                </label>
                <select
                  id="parent_id"
                  value={form.parent_id || ''}
                  onChange={(e) => handleFormChange('parent_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">- 無上級類別 -</option>
                  {settings
                    .filter(item => item.id !== editingRecord?.id)
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalVisible(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${loading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  disabled={loading}
                >
                  {loading ? '處理中...' : '確定'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 刪除確認模態 */}
      {confirmDelete.visible && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">確認刪除</h3>
            <p className="mb-6 text-gray-600">確定要刪除此設定嗎？此操作無法復原。</p>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setConfirmDelete({ visible: false, id: null })}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 ${loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                disabled={loading}
              >
                {loading ? '處理中...' : '確定刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 