import { Suspense } from 'react';

export default function MemberEditPage({ params }: { params: { id: string } }) {
    const memberId = parseInt(params.id);
    // 動態導入組件解決模塊解析問題
    const MemberEditForm = require('../../components/MemberEditForm').default;

    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center">正在載入會員資料...</div>}>
            <MemberEditForm memberId={memberId} />
        </Suspense>
    );
} 