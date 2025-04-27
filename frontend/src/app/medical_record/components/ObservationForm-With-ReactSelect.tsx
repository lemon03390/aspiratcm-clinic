import React, { useState } from 'react';
import { pulsePositions, pulseQualities, tongueCoatings, tongueColors, tongueQualities, tongueShapes } from '../data';
import FuzzySearchInput from './FuzzySearchInput';
import GroupedTreeSelect, { TreeNode } from './GroupedTreeSelect';

interface MenstrualPeriod {
    startDate: string;
    endDate: string;
}

interface ObservationData {
    tongueColor: string[];
    tongueCoating: string[];
    tongueShape: string[];
    tongueQuality: string[];
    pulsePosition: string[];
    pulseQuality: string[];
    generalAppearance: string;
    facialColor: string;
    behaviour: string;
    speaking: string;
    breathing: string;
    bodyShape: string;
    skinCondition: string;
    allergies: string;
    sleep: string;
    appetite: string;
    digestion: string;
    bowelMovement: string;
    urination: string;
    menstrualPeriod: MenstrualPeriod;
    menstrualCondition: string;
    chestPain: string;
    abdomenPain: string;
    headPain: string;
    limbPain: string;
    pharynxPain: string;
    sweating: string;
}

interface ObservationFormProps {
    onChange: (data: ObservationData) => void;
    value?: ObservationData;
    disabled?: boolean;
}

// 將普通字符串數組轉換為樹狀結構
const convertToTreeData = (items: string[]): TreeNode[] => {
    return items.map(item => ({
        label: item,
        value: item,
    }));
};

// 將分類數據轉換為樹狀結構
const getTongueColorTreeData = (): TreeNode[] => {
    return [
        {
            label: '舌質色澤',
            value: 'tongue-color',
            children: convertToTreeData(tongueColors)
        }
    ];
};

const getTongueCoatingTreeData = (): TreeNode[] => {
    return [
        {
            label: '舌苔',
            value: 'tongue-coating',
            children: convertToTreeData(tongueCoatings)
        }
    ];
};

const getTongueShapeTreeData = (): TreeNode[] => {
    return [
        {
            label: '舌形',
            value: 'tongue-shape',
            children: convertToTreeData(tongueShapes)
        }
    ];
};

const getTongueQualityTreeData = (): TreeNode[] => {
    return [
        {
            label: '舌質',
            value: 'tongue-quality',
            children: convertToTreeData(tongueQualities)
        }
    ];
};

const getPulsePositionTreeData = (): TreeNode[] => {
    return [
        {
            label: '脈位',
            value: 'pulse-position',
            children: convertToTreeData(pulsePositions)
        }
    ];
};

const getPulseQualityTreeData = (): TreeNode[] => {
    return [
        {
            label: '脈象',
            value: 'pulse-quality',
            children: convertToTreeData(pulseQualities)
        }
    ];
};

// 搜尋樹狀數據
const searchTreeData = async (treeData: TreeNode[], searchTerm: string): Promise<TreeNode[]> => {
    return new Promise((resolve) => {
        // 模擬網絡延遲
        setTimeout(() => {
            // 如果搜尋詞為空，返回所有數據
            if (!searchTerm) {
                resolve(treeData);
                return;
            }

            // 遞歸搜尋函數
            const searchInTree = (nodes: TreeNode[], term: string): TreeNode[] => {
                const matches: TreeNode[] = [];

                for (const node of nodes) {
                    // 檢查當前節點是否匹配
                    const isMatch = node.label.toLowerCase().includes(term.toLowerCase());

                    // 如果有子節點，則搜尋子節點
                    let childMatches: TreeNode[] = [];
                    if (node.children && node.children.length > 0) {
                        childMatches = searchInTree(node.children, term);
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

            const searchResults = searchInTree(treeData, searchTerm);
            resolve(searchResults);
        }, 300); // 300ms 延遲模擬網絡請求
    });
};

const ObservationForm: React.FC<ObservationFormProps> = ({
    onChange,
    value,
    disabled = false
}) => {
    const initialState: ObservationData = {
        tongueColor: [],
        tongueCoating: [],
        tongueShape: [],
        tongueQuality: [],
        pulsePosition: [],
        pulseQuality: [],
        generalAppearance: '',
        facialColor: '',
        behaviour: '',
        speaking: '',
        breathing: '',
        bodyShape: '',
        skinCondition: '',
        allergies: '',
        sleep: '',
        appetite: '',
        digestion: '',
        bowelMovement: '',
        urination: '',
        menstrualPeriod: { startDate: '', endDate: '' },
        menstrualCondition: '',
        chestPain: '',
        abdomenPain: '',
        headPain: '',
        limbPain: '',
        pharynxPain: '',
        sweating: ''
    };

    const [observationData, setObservationData] = useState<ObservationData>(value || initialState);

    const handleInputChange = (field: string, value: string) => {
        const newData = {
            ...observationData,
            [field]: value
        };
        setObservationData(newData);
        onChange(newData);
    };

    const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
        const newData = {
            ...observationData,
            menstrualPeriod: {
                ...observationData.menstrualPeriod,
                [field]: value
            }
        };
        setObservationData(newData);
        onChange(newData);
    };

    const handleAddItem = (field: keyof ObservationData, value: string) => {
        if (Array.isArray(observationData[field])) {
            if (!(observationData[field] as string[]).includes(value)) {
                const newArray = [...(observationData[field] as string[]), value];
                const newData = {
                    ...observationData,
                    [field]: newArray
                };
                setObservationData(newData);
                onChange(newData);
            }
        }
    };

    const handleRemoveItem = (field: keyof ObservationData, value: string) => {
        if (Array.isArray(observationData[field])) {
            const newArray = (observationData[field] as string[]).filter(item => item !== value);
            const newData = {
                ...observationData,
                [field]: newArray
            };
            setObservationData(newData);
            onChange(newData);
        }
    };

    const handleMultiSelectChange = (field: keyof ObservationData, values: string[]) => {
        if (Array.isArray(observationData[field])) {
            const newData = {
                ...observationData,
                [field]: values
            };
            setObservationData(newData);
            onChange(newData);
        }
    };

    return (
        <div className="space-y-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold border-b pb-2">望聞問切記錄</h2>

            {/* 舌診部分 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold mb-4">舌診</h3>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-600">舌質色澤（多選）</label>
                        <div className="space-y-2">
                            {/* FuzzySearchInput */}
                            <FuzzySearchInput
                                options={tongueColors}
                                placeholder="搜尋舌質色澤"
                                onSelect={(value) => handleAddItem('tongueColor', value)}
                                multiple={true}
                                selectedItems={observationData.tongueColor}
                                onRemove={(value) => handleRemoveItem('tongueColor', value)}
                                className="border-gray-300"
                            />

                            {/* GroupedTreeSelect替代方案 */}
                            <div className="mt-2">
                                <label className="block text-xs text-gray-500 mb-1">或從樹狀圖選擇色澤：</label>
                                <GroupedTreeSelect
                                    placeholder="從樹狀圖選擇舌質色澤"
                                    loadData={(query) => searchTreeData(getTongueColorTreeData(), query)}
                                    onChange={(values) => handleMultiSelectChange('tongueColor', values)}
                                    value={observationData.tongueColor}
                                    multiple={true}
                                    allowClear={true}
                                    treeData={getTongueColorTreeData()}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 mt-4">
                        <label className="block text-sm font-medium text-gray-600">舌苔（多選）</label>
                        <div className="space-y-2">
                            {/* FuzzySearchInput */}
                            <FuzzySearchInput
                                options={tongueCoatings}
                                placeholder="搜尋舌苔"
                                onSelect={(value) => handleAddItem('tongueCoating', value)}
                                multiple={true}
                                selectedItems={observationData.tongueCoating}
                                onRemove={(value) => handleRemoveItem('tongueCoating', value)}
                                className="border-gray-300"
                            />

                            {/* GroupedTreeSelect替代方案 */}
                            <div className="mt-2">
                                <label className="block text-xs text-gray-500 mb-1">或從樹狀圖選擇舌苔：</label>
                                <GroupedTreeSelect
                                    placeholder="從樹狀圖選擇舌苔"
                                    loadData={(query) => searchTreeData(getTongueCoatingTreeData(), query)}
                                    onChange={(values) => handleMultiSelectChange('tongueCoating', values)}
                                    value={observationData.tongueCoating}
                                    multiple={true}
                                    allowClear={true}
                                    treeData={getTongueCoatingTreeData()}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 mt-4">
                        <label className="block text-sm font-medium text-gray-600">舌形（多選）</label>
                        <div className="space-y-2">
                            {/* FuzzySearchInput */}
                            <FuzzySearchInput
                                options={tongueShapes}
                                placeholder="搜尋舌形"
                                onSelect={(value) => handleAddItem('tongueShape', value)}
                                multiple={true}
                                selectedItems={observationData.tongueShape}
                                onRemove={(value) => handleRemoveItem('tongueShape', value)}
                                className="border-gray-300"
                            />

                            {/* GroupedTreeSelect替代方案 */}
                            <div className="mt-2">
                                <label className="block text-xs text-gray-500 mb-1">或從樹狀圖選擇舌形：</label>
                                <GroupedTreeSelect
                                    placeholder="從樹狀圖選擇舌形"
                                    loadData={(query) => searchTreeData(getTongueShapeTreeData(), query)}
                                    onChange={(values) => handleMultiSelectChange('tongueShape', values)}
                                    value={observationData.tongueShape}
                                    multiple={true}
                                    allowClear={true}
                                    treeData={getTongueShapeTreeData()}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 mt-4">
                        <label className="block text-sm font-medium text-gray-600">舌質（多選）</label>
                        <div className="space-y-2">
                            {/* FuzzySearchInput */}
                            <FuzzySearchInput
                                options={tongueQualities}
                                placeholder="搜尋舌質"
                                onSelect={(value) => handleAddItem('tongueQuality', value)}
                                multiple={true}
                                selectedItems={observationData.tongueQuality}
                                onRemove={(value) => handleRemoveItem('tongueQuality', value)}
                                className="border-gray-300"
                            />

                            {/* GroupedTreeSelect替代方案 */}
                            <div className="mt-2">
                                <label className="block text-xs text-gray-500 mb-1">或從樹狀圖選擇舌質：</label>
                                <GroupedTreeSelect
                                    placeholder="從樹狀圖選擇舌質"
                                    loadData={(query) => searchTreeData(getTongueQualityTreeData(), query)}
                                    onChange={(values) => handleMultiSelectChange('tongueQuality', values)}
                                    value={observationData.tongueQuality}
                                    multiple={true}
                                    allowClear={true}
                                    treeData={getTongueQualityTreeData()}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-4">脈診</h3>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-600">脈位（多選）</label>
                        <div className="space-y-2">
                            {/* FuzzySearchInput */}
                            <FuzzySearchInput
                                options={pulsePositions}
                                placeholder="搜尋脈位"
                                onSelect={(value) => handleAddItem('pulsePosition', value)}
                                multiple={true}
                                selectedItems={observationData.pulsePosition}
                                onRemove={(value) => handleRemoveItem('pulsePosition', value)}
                                className="border-gray-300"
                            />

                            {/* GroupedTreeSelect替代方案 */}
                            <div className="mt-2">
                                <label className="block text-xs text-gray-500 mb-1">或從樹狀圖選擇脈位：</label>
                                <GroupedTreeSelect
                                    placeholder="從樹狀圖選擇脈位"
                                    loadData={(query) => searchTreeData(getPulsePositionTreeData(), query)}
                                    onChange={(values) => handleMultiSelectChange('pulsePosition', values)}
                                    value={observationData.pulsePosition}
                                    multiple={true}
                                    allowClear={true}
                                    treeData={getPulsePositionTreeData()}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 mt-4">
                        <label className="block text-sm font-medium text-gray-600">脈象（多選）</label>
                        <div className="space-y-2">
                            {/* FuzzySearchInput */}
                            <FuzzySearchInput
                                options={pulseQualities}
                                placeholder="搜尋脈象"
                                onSelect={(value) => handleAddItem('pulseQuality', value)}
                                multiple={true}
                                selectedItems={observationData.pulseQuality}
                                onRemove={(value) => handleRemoveItem('pulseQuality', value)}
                                className="border-gray-300"
                            />

                            {/* GroupedTreeSelect替代方案 */}
                            <div className="mt-2">
                                <label className="block text-xs text-gray-500 mb-1">或從樹狀圖選擇脈象：</label>
                                <GroupedTreeSelect
                                    placeholder="從樹狀圖選擇脈象"
                                    loadData={(query) => searchTreeData(getPulseQualityTreeData(), query)}
                                    onChange={(values) => handleMultiSelectChange('pulseQuality', values)}
                                    value={observationData.pulseQuality}
                                    multiple={true}
                                    allowClear={true}
                                    treeData={getPulseQualityTreeData()}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 其他望聞問切項目 */}
                    <div className="space-y-4 mt-6">
                        <h3 className="text-lg font-semibold">其他觀察</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-600">整體外觀</label>
                            <textarea
                                value={observationData.generalAppearance}
                                onChange={(e) => handleInputChange('generalAppearance', e.target.value)}
                                disabled={disabled}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                rows={2}
                            ></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600">面色</label>
                            <textarea
                                value={observationData.facialColor}
                                onChange={(e) => handleInputChange('facialColor', e.target.value)}
                                disabled={disabled}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                rows={2}
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ObservationForm; 