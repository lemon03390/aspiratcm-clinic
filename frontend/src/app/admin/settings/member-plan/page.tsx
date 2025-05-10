import { Suspense } from 'react';

export default function MemberPlanPage() {
    // 動態導入組件以解決模塊解析問題
    const MemberPlanManagement = require('./MemberPlanManagement').default;

    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center">正在載入設置資料...</div>}>
            <MemberPlanManagement />
        </Suspense>
    );
} 