"use client";

import { useState } from 'react';
import AsyncTreeSelect from '../../AsyncTreeSelect';
import GroupedTreeSelect, { TreeNode } from '../../GroupedTreeSelect';

// 示例數據
const exampleTreeData: TreeNode[] = [
    {
        label: '舌診',
        value: 'tongue',
        children: [
            {
                label: '舌質',
                value: 'tongue-quality',
                children: [
                    { label: '淡白舌', value: 'pale-tongue' },
                    { label: '淡紅舌', value: 'light-red-tongue' },
                    { label: '紅舌', value: 'red-tongue' },
                    { label: '絳舌', value: 'crimson-tongue' }
                ]
            },
            {
                label: '舌苔',
                value: 'tongue-coating',
                children: [
                    { label: '薄苔', value: 'thin-coating' },
                    { label: '厚苔', value: 'thick-coating' },
                    { label: '白苔', value: 'white-coating' },
                    { label: '黃苔', value: 'yellow-coating' },
                    { label: '灰黑苔', value: 'gray-black-coating' }
                ]
            },
            {
                label: '舌形',
                value: 'tongue-shape',
                children: [
                    { label: '胖大舌', value: 'swollen-tongue' },
                    { label: '瘦小舌', value: 'thin-small-tongue' },
                    { label: '點刺舌', value: 'thorny-tongue' },
                    { label: '裂紋舌', value: 'cracked-tongue' },
                    { label: '齒痕舌', value: 'teeth-marked-tongue' }
                ]
            }
        ]
    },
    {
        label: '脈診',
        value: 'pulse',
        children: [
            {
                label: '脈位',
                value: 'pulse-position',
                children: [
                    { label: '寸脈', value: 'cun-pulse' },
                    { label: '關脈', value: 'guan-pulse' },
                    { label: '尺脈', value: 'chi-pulse' }
                ]
            },
            {
                label: '脈象',
                value: 'pulse-quality',
                children: [
                    { label: '浮脈', value: 'floating-pulse' },
                    { label: '沉脈', value: 'sinking-pulse' },
                    { label: '遲脈', value: 'slow-pulse' },
                    { label: '數脈', value: 'rapid-pulse' },
                    { label: '虛脈', value: 'deficient-pulse' },
                    { label: '實脈', value: 'excess-pulse' },
                    { label: '滑脈', value: 'slippery-pulse' },
                    { label: '澀脈', value: 'choppy-pulse' }
                ]
            }
        ]
    }
];

// 模擬搜尋功能
const searchTreeData = async (data: any[], searchTerm: string): Promise<any[]> => {
    return new Promise((resolve) => {
        // 模擬網絡延遲
        setTimeout(() => {
            // 如果搜尋詞為空，返回所有數據
            if (!searchTerm) {
                resolve(data);
                return;
            }

            // 創建搜尋結果的深拷貝
            const result: TreeNode[] = [];

            // 遞歸搜尋函數
            const searchInTree = (nodes: any[], term: string, path: any[] = []): any[] => {
                const matches: any[] = [];

                for (const node of nodes) {
                    // 檢查當前節點是否匹配
                    const isMatch = node.label.toLowerCase().includes(term.toLowerCase());

                    // 如果有子節點，則搜尋子節點
                    let childMatches: any[] = [];
                    if (node.children && node.children.length > 0) {
                        childMatches = searchInTree(node.children, term, [...path, node]);
                    }

                    // 如果當前節點匹配或有匹配的子節點
                    if (isMatch || childMatches.length > 0) {
                        // 創建一個包含匹配子節點的新節點
                        const matchedNode = {
                            ...node,
                            children: childMatches.length > 0 ? childMatches : undefined
                        };
                        matches.push(matchedNode);
                    }
                }

                return matches;
            };

            const searchResults = searchInTree(data, searchTerm);
            resolve(searchResults);
        }, 300); // 300ms 延遲模擬網絡請求
    });
};

// 性能測試函數
const measurePerformance = (callback: () => void, name: string) => {
    const startTime = performance.now();
    callback();
    const endTime = performance.now();
    console.log(`${name} 執行時間: ${endTime - startTime} ms`);
    return endTime - startTime;
};

export default function CompareTreeSelects() {
    const [rcTreeSelectValues, setRcTreeSelectValues] = useState<string[]>([]);
    const [reactSelectValues, setReactSelectValues] = useState<string[]>([]);
    const [rcRenderTime, setRcRenderTime] = useState<number>(0);
    const [reactRenderTime, setReactRenderTime] = useState<number>(0);

    const handleOriginalTreeSelect = (values: string[]) => {
        const time = measurePerformance(() => {
            setRcTreeSelectValues(values);
        }, "rc-tree-select onChange");
        setRcRenderTime(time);
    };

    const handleNewTreeSelect = (values: string[]) => {
        const time = measurePerformance(() => {
            setReactSelectValues(values);
        }, "react-select onChange");
        setReactRenderTime(time);
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-6 text-center">樹狀選擇器比較頁面</h1>
            <p className="text-gray-600 text-center mb-8">
                比較 rc-tree-select 與 react-select 的功能、性能和用戶體驗
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* rc-tree-select */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">rc-tree-select (原有實現)</h2>
                    <p className="text-gray-600 mb-4">基於 rc-tree-select 的樹狀選擇器</p>

                    <div className="mb-4">
                        <AsyncTreeSelect
                            placeholder="使用 rc-tree-select 搜尋或選擇項目"
                            loadData={(query) => searchTreeData(exampleTreeData, query)}
                            onChange={handleOriginalTreeSelect}
                            value={rcTreeSelectValues}
                            multiple={true}
                            allowClear={true}
                            treeData={exampleTreeData}
                            minSearchCharacters={1}
                        />
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-medium mb-2">已選擇：</h3>
                        <div className="bg-gray-50 p-3 rounded-md min-h-[100px]">
                            {rcTreeSelectValues.length === 0 ? (
                                <p className="text-gray-500">尚未選擇</p>
                            ) : (
                                <ul className="list-disc pl-5">
                                    {rcTreeSelectValues.map((value) => (
                                        <li key={value} className="text-blue-600">{value}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                            <span>渲染時間: {rcRenderTime.toFixed(2)} ms</span>
                        </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-600">
                        <h4 className="font-medium mb-1">已知問題:</h4>
                        <ul className="list-disc pl-5">
                            <li>樹狀結構展開時有渲染問題</li>
                            <li>選擇後顯示的值格式不一致</li>
                            <li>搜尋結果不穩定</li>
                            <li>樣式難以自定義</li>
                        </ul>
                    </div>
                </div>

                {/* react-select */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">react-select (新實現)</h2>
                    <p className="text-gray-600 mb-4">基於 react-select 的分組選擇器</p>

                    <div className="mb-4">
                        <GroupedTreeSelect
                            placeholder="使用 react-select 搜尋或選擇項目"
                            loadData={(query) => searchTreeData(exampleTreeData, query)}
                            onChange={handleNewTreeSelect}
                            value={reactSelectValues}
                            multiple={true}
                            allowClear={true}
                            treeData={exampleTreeData}
                            minSearchCharacters={1}
                        />
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-medium mb-2">已選擇：</h3>
                        <div className="bg-gray-50 p-3 rounded-md min-h-[100px]">
                            {reactSelectValues.length === 0 ? (
                                <p className="text-gray-500">尚未選擇</p>
                            ) : (
                                <ul className="list-disc pl-5">
                                    {reactSelectValues.map((value) => (
                                        <li key={value} className="text-blue-600">{value}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                            <span>渲染時間: {reactRenderTime.toFixed(2)} ms</span>
                        </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-600">
                        <h4 className="font-medium mb-1">優勢:</h4>
                        <ul className="list-disc pl-5">
                            <li>更好的樣式和自定義支持</li>
                            <li>更穩定的選擇和渲染邏輯</li>
                            <li>更好的搜尋體驗</li>
                            <li>更多的文檔和社區支持</li>
                            <li>無需引入額外的樹狀組件庫</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="mt-12 bg-blue-50 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4">總結與建議</h2>
                <p className="mb-4">
                    根據測試和比較，使用 React-Select 實現分組選擇器替代 rc-tree-select 是一個可行的方案，且提供了更好的用戶體驗和開發體驗。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-medium mb-2">優勢:</h3>
                        <ul className="list-disc pl-5 text-sm">
                            <li>React-Select 是主流組件，有豐富的文檔和社區支持</li>
                            <li>更好的樣式自定義能力和主題支持</li>
                            <li>與現代 React 生態更好的集成</li>
                            <li>引入的 bundle size 更小，減少了應用大小</li>
                            <li>更穩定的搜尋和選擇體驗</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-medium mb-2">遷移建議:</h3>
                        <ul className="list-disc pl-5 text-sm">
                            <li>使用相同的數據結構和接口保持兼容性</li>
                            <li>先在非關鍵頁面替換測試效果</li>
                            <li>確保搜尋邏輯與原實現保持一致</li>
                            <li>可通過配置適應不同組件的樣式風格</li>
                            <li>在移動端進行額外測試確保良好體驗</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
} 