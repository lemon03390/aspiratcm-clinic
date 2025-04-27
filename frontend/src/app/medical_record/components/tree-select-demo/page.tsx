"use client";

import GroupedTreeSelectDemo from '../GroupedTreeSelectDemo';

export default function TreeSelectDemoPage() {
    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-6 text-center">樹狀選擇器對比測試頁面</h1>
            <p className="text-gray-600 text-center mb-8">
                此頁面用於測試和比較 React-Select 與 rc-tree-select 的功能和性能
            </p>

            <GroupedTreeSelectDemo />
        </div>
    )
} 