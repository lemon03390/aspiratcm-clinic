import { Suspense } from 'react';
import NewMemberForm from '../../member/components/NewMemberForm';

export default function NewMemberPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center">正在載入...</div>}>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">新增會員</h1>
                <NewMemberForm />
            </div>
        </Suspense>
    );
} 