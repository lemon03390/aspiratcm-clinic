'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMember, getMemberBalance } from '../services/memberService';
import { Member, MemberBalance } from '../types';

export default function MemberDetail({ memberId }: { memberId: number }) {
    const [member, setMember] = useState<Member | null>(null);
    const [balance, setBalance] = useState<MemberBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                // 並行獲取會員資料和餘額
                const [memberData, balanceData] = await Promise.all([
                    getMember(memberId),
                    getMemberBalance(memberId)
                ]);

                setMember(memberData);
                setBalance(balanceData);
            } catch (err) {
                console.error('獲取會員資料失敗:', err);
                setError(err instanceof Error ? err.message : '獲取會員資料失敗');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [memberId]);

    const handleBalanceUpdate = (newBalance: MemberBalance) => {
        setBalance(newBalance);
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
                </div>
                <p className="mt-4 text-gray-600">正在載入會員資料...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
                    <p>{error}</p>
                </div>
                <button
                    onClick={() => router.push('/member')}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                    返回會員列表
                </button>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
                    <p>無法找到此會員資料</p>
                </div>
                <button
                    onClick={() => router.push('/member')}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                    返回會員列表
                </button>
            </div>
        );
    }

    // 導入組件在呈現時才加載，避免循環引用問題
    const MemberBalanceActions = require('./MemberBalanceActions').default;
    const MemberTransactions = require('./MemberTransactions').default;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">會員詳細資料</h1>
                <div className="space-x-2">
                    <button
                        onClick={() => router.push(`/member/edit/${memberId}`)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        編輯會員資料
                    </button>
                    <button
                        onClick={() => router.push('/member')}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                        返回列表
                    </button>
                </div>
            </div>

            {/* 會員基本資料 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">基本資料</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-gray-600">會員姓名</p>
                        <p className="font-medium">{member.patientName}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">身份證號碼</p>
                        <p className="font-medium">{member.hkid || '未設置'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">電話號碼</p>
                        <p className="font-medium">{member.phoneNumber || '未設置'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">病人 ID</p>
                        <p className="font-medium">{member.patient_id || '未設置'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">聯絡地址</p>
                        <p className="font-medium">{member.contactAddress || '未設置'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">持卡狀態</p>
                        <p className="font-medium">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${member.haveCard ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {member.haveCard ? '已持有' : '未持有'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-600">同意書簽署</p>
                        <p className="font-medium">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${member.termsConsent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {member.termsConsent ? '已簽署' : '未簽署'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-600">建立時間</p>
                        <p className="font-medium">{new Date(member.created_at).toLocaleString('zh-TW')}</p>
                    </div>
                </div>
            </div>

            {/* 餘額資訊 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">帳戶餘額</h2>
                {balance ? (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <p className="text-blue-700 text-sm">儲值金額</p>
                                <p className="text-2xl font-bold text-blue-800">HK$ {balance.storedValue}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                <p className="text-green-700 text-sm">贈送金額</p>
                                <p className="text-2xl font-bold text-green-800">HK$ {balance.giftedValue}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                <p className="text-purple-700 text-sm">帳戶總額</p>
                                <p className="text-2xl font-bold text-purple-800">HK$ {balance.storedValue + balance.giftedValue}</p>
                            </div>
                        </div>

                        {/* 餘額操作組件 */}
                        <MemberBalanceActions
                            memberId={memberId}
                            onBalanceUpdate={handleBalanceUpdate}
                        />
                    </div>
                ) : (
                    <p className="text-gray-500">無餘額資料</p>
                )}
            </div>

            {/* 交易記錄組件 */}
            <MemberTransactions memberId={memberId} />
        </div>
    );
} 