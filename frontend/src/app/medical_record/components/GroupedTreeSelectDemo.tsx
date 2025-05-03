import React, { useState } from 'react';
import GroupedTreeSelect, { TreeNode } from './GroupedTreeSelect';

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
const searchTreeData = async (data: TreeNode[], searchTerm: string): Promise<TreeNode[]> => {
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
            const searchInTree = (nodes: TreeNode[], term: string, path: TreeNode[] = []): TreeNode[] => {
                const matches: TreeNode[] = [];

                for (const node of nodes) {
                    // 檢查當前節點是否匹配
                    const isMatch = node.label.toLowerCase().includes(term.toLowerCase());

                    // 如果有子節點，則搜尋子節點
                    let childMatches: TreeNode[] = [];
                    if (node.children && node.children.length > 0) {
                        childMatches = searchInTree(node.children, term, [...path, node]);
                    }

                    // 如果當前節點匹配或有匹配的子節點
                    if (isMatch || childMatches.length > 0) {
                        // 創建一個包含匹配子節點的新節點
                        const matchedNode: TreeNode = {
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

const GroupedTreeSelectDemo: React.FC = () => {
    const [selectedValues, setSelectedValues] = useState<string[]>([]);

    const handleSelect = (values: string[]) => {
        console.log('選擇的值:', values);
        setSelectedValues(values);
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">GroupedTreeSelect 示例</h1>

            <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">選擇中醫診斷要素：</h2>
                <GroupedTreeSelect
                    placeholder="搜尋或選擇診斷要素"
                    loadData={(query) => searchTreeData(exampleTreeData, query)}
                    onChange={handleSelect}
                    value={selectedValues}
                    multiple={true}
                    allowClear={true}
                    treeData={exampleTreeData}
                    minSearchCharacters={1}
                />
            </div>

            <div className="mt-4">
                <h3 className="text-md font-medium mb-2">已選擇：</h3>
                <div className="bg-gray-50 p-3 rounded-md">
                    {selectedValues.length === 0 ? (
                        <p className="text-gray-500">尚未選擇</p>
                    ) : (
                        <ul className="list-disc pl-5">
                            {selectedValues.map((value) => (
                                <li key={value} className="text-blue-600">{value}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupedTreeSelectDemo; 