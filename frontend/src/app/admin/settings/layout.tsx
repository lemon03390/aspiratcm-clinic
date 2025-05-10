"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

// 系統設定分類
const SETTING_CATEGORIES = [
  {
    id: 'reference-data',
    title: '參考資料管理',
    description: '管理系統中使用的參考資料和介紹人',
    items: [
      { id: 'tcm-reference', title: 'TCM參考資料', path: '/admin/settings', description: '管理中醫診所相關的參考資料' },
      { id: 'referral-management', title: '介紹人管理', path: '/admin/settings/referral-management', description: '管理患者介紹人相關資料' },
    ]
  },
  {
    id: 'medical-system',
    title: '醫療系統管理',
    description: '管理醫師資料和相關醫療設定',
    items: [
      { id: 'doctor-management', title: '醫師資料管理', path: '/admin/settings/doctor-management', description: '管理診所醫師的基本資料和排班' },
    ]
  },
  {
    id: 'member-system',
    title: '會員系統管理',
    description: '管理會員計劃和相關設定',
    items: [
      { id: 'member-plan', title: '會員計劃管理', path: '/admin/settings/member-plan', description: '設定和管理不同層級的會員計劃' },
    ]
  },
  {
    id: 'system-config',
    title: '系統配置管理',
    description: '管理系統基本設定和診症類型',
    items: [
      { id: 'consultation-types', title: '診症類型管理', path: '/admin/settings/consultation-types', description: '設定診所提供的診症類型和費用' },
    ]
  }
];

// 圖標組件
const SettingsIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UsersIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const DatabaseIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const MedicalIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const MembershipIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const SearchIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const HomeIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const CategoryIcons = {
  'reference-data': DatabaseIcon,
  'medical-system': MedicalIcon,
  'member-system': MembershipIcon,
  'system-config': SettingsIcon
};

interface SystemSettingLayoutProps {
  children: ReactNode;
}

export default function SystemSettingLayout({ children }: SystemSettingLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // 根據當前路徑展開對應的分類
  useEffect(() => {
    const newExpanded = new Set<string>();

    SETTING_CATEGORIES.forEach(category => {
      const shouldExpand = category.items.some(item => pathname === item.path);
      if (shouldExpand) {
        newExpanded.add(category.id);
      }
    });

    setExpandedCategories(newExpanded);
    setIsMobileMenuOpen(false); // 路徑變更時關閉行動裝置選單
  }, [pathname]);

  // 切換分類展開/收起
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(categoryId)) {
        newExpanded.delete(categoryId);
      } else {
        newExpanded.add(categoryId);
      }
      return newExpanded;
    });
  };

  // 獲取當前頁面標題和描述
  const getCurrentPageInfo = () => {
    for (const category of SETTING_CATEGORIES) {
      for (const item of category.items) {
        if (item.path === pathname) {
          return { title: item.title, description: item.description, categoryTitle: category.title };
        }
      }
    }
    return { title: "系統設定", description: "設定和管理系統選項", categoryTitle: "" };
  };

  // 搜尋設定項目
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);

    // 如果有搜尋內容，自動展開所有分類
    if (e.target.value) {
      const allCategories = SETTING_CATEGORIES.map(category => category.id);
      setExpandedCategories(new Set(allCategories));
    }
  };

  // 篩選符合搜尋條件的選項
  const getFilteredCategories = () => {
    if (!searchQuery) {
      return SETTING_CATEGORIES;
    }

    return SETTING_CATEGORIES.map(category => {
      const filteredItems = category.items.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return { ...category, items: filteredItems };
    }).filter(category => category.items.length > 0);
  };

  const pageInfo = getCurrentPageInfo();
  const filteredCategories = getFilteredCategories();

  return (
    <div className="flex flex-col md:flex-row bg-gray-50 min-h-screen">
      {/* 行動裝置標題和選單按鈕 */}
      <div className="md:hidden bg-white p-4 border-b flex justify-between items-center">
        <h1 className="font-bold text-gray-800">系統設定</h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-500 p-2 rounded-md hover:bg-gray-100"
        >
          {isMobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* 側邊導航 */}
      <div className={`w-full md:w-72 bg-white shadow-md z-10 overflow-auto md:block ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="p-4 border-b border-gray-200 hidden md:block">
          <h1 className="text-xl font-bold text-gray-800">系統設定</h1>
          <p className="text-sm text-gray-600 mt-1">設定和管理系統選項</p>
        </div>

        {/* 搜尋框 */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="搜尋設定..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <nav className="mt-2">
          {filteredCategories.map(category => {
            const IconComponent = CategoryIcons[category.id];
            const isExpanded = expandedCategories.has(category.id);

            return (
              <div key={category.id} className="mb-2">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  <IconComponent className="h-5 w-5 mr-2 text-gray-500" />
                  <span className="font-medium">{category.title}</span>
                  <svg
                    className={`ml-auto h-4 w-4 transform ${isExpanded ? 'rotate-180' : ''} transition-transform duration-200`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="pl-10 pr-2 py-1 bg-gray-50">
                    {category.items.map(item => (
                      <Link href={item.path} key={item.id}>
                        <span className={`block px-3 py-2 my-1 rounded-md text-sm ${pathname === item.path ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                          {item.title}
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* 主內容區 */}
      <div className="flex-1 overflow-auto">
        {/* 麵包屑導航 */}
        <div className="bg-white border-b p-4 flex items-center text-sm text-gray-600">
          <Link href="/admin" className="flex items-center hover:text-blue-600">
            <HomeIcon className="h-4 w-4 mr-1" />
            主頁
          </Link>
          <svg className="h-4 w-4 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/admin/settings" className="hover:text-blue-600">
            系統設定
          </Link>
          {pageInfo.categoryTitle && (
            <>
              <svg className="h-4 w-4 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>{pageInfo.categoryTitle}</span>
            </>
          )}
          {pathname !== '/admin/settings' && (
            <>
              <svg className="h-4 w-4 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium text-gray-800">{pageInfo.title}</span>
            </>
          )}
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">{pageInfo.title}</h1>
            <p className="text-gray-600 mt-1">{pageInfo.description}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 