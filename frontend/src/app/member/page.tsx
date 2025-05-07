import { Suspense } from 'react';
import MemberClient from './components/MemberClient';

export default function MemberPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center">正在載入會員資料...</div>}>
            <MemberClient />
        </Suspense>
    );
} 