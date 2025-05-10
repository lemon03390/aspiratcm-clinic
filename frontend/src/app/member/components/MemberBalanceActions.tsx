'use client';

import { useEffect, useState } from 'react';
import { getMemberPlans, spendMemberAccount, topUpMemberAccount } from '../services/memberService';
import { MemberBalance, MemberPlan } from '../types';

interface MemberBalanceActionsProps {
    memberId: number;
    onBalanceUpdate: (balance: MemberBalance) => void;
}

export default function MemberBalanceActions({ memberId, onBalanceUpdate }: MemberBalanceActionsProps) {
    const [topUpPlans, setTopUpPlans] = useState<MemberPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
    const [customTopUpAmount, setCustomTopUpAmount] = useState<number>(0);
    const [customGiftAmount, setCustomGiftAmount] = useState<number>(0);
    const [spendAmount, setSpendAmount] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'topup' | 'spend' | null>(null);

    // 載入增值計劃
    useEffect(() => {
        const fetchTopUpPlans = async () => {
            try {
                // 使用新的API函數
                const plansData = await getMemberPlans(true); // 只獲取啟用的計劃
                setTopUpPlans(plansData.items);
            } catch (err) {
                console.error('獲取增值計劃失敗:', err);
                setError('無法獲取增值計劃');
            }
        };

        fetchTopUpPlans();
    }, []);

    const handleSelectPlan = (planId: number | null) => {
        setSelectedPlanId(planId);

        // 如果選擇了計劃，自動填入對應金額
        if (planId) {
            const plan = topUpPlans.find(p => p.id === planId);
            if (plan) {
                setCustomTopUpAmount(plan.base_amount);
                setCustomGiftAmount(plan.bonus_amount);
            }
        } else {
            // 清空自定義金額
            setCustomTopUpAmount(0);
            setCustomGiftAmount(0);
        }
    };

    const handleTopUp = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // 檢查金額有效性
            if (selectedPlanId === null && customTopUpAmount <= 0) {
                throw new Error('請輸入有效的增值金額');
            }

            // 執行增值
            const result = await topUpMemberAccount(memberId, {
                amount: customTopUpAmount,
                gift_amount: customGiftAmount,
                plan_id: selectedPlanId || undefined
            });

            // 更新餘額和顯示成功信息
            onBalanceUpdate(result);
            setSuccess(`成功增值 HK$ ${customTopUpAmount + customGiftAmount}`);

            // 重置表單
            if (!selectedPlanId) {
                setCustomTopUpAmount(0);
                setCustomGiftAmount(0);
            }
        } catch (err) {
            console.error('增值失敗:', err);
            setError(err instanceof Error ? err.message : '增值操作失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleSpend = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // 檢查金額有效性
            if (spendAmount <= 0) {
                throw new Error('請輸入有效的消費金額');
            }

            // 執行消費
            const result = await spendMemberAccount(memberId, { amount: spendAmount });

            // 更新餘額和顯示成功信息
            onBalanceUpdate(result);
            setSuccess(`成功扣減 HK$ ${spendAmount}`);

            // 重置表單
            setSpendAmount(0);
        } catch (err) {
            console.error('消費失敗:', err);
            setError(err instanceof Error ? err.message : '消費操作失敗');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* 操作選擇按鈕 */}
            <div className="flex space-x-4 mb-4">
                <button
                    className={`px-4 py-2 rounded ${actionType === 'topup' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    onClick={() => setActionType('topup')}
                >
                    會員增值
                </button>
                <button
                    className={`px-4 py-2 rounded ${actionType === 'spend' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    onClick={() => setActionType('spend')}
                >
                    會員消費
                </button>
            </div>

            {/* 錯誤和成功信息 */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
                    <p>{success}</p>
                </div>
            )}

            {/* 增值表單 */}
            {actionType === 'topup' && (
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                    <h3 className="text-lg font-semibold mb-4">會員增值</h3>

                    {/* 增值計劃選擇 */}
                    {topUpPlans.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2">選擇增值計劃</label>
                            <div className="flex flex-wrap gap-2">
                                {topUpPlans.map(plan => (
                                    <button
                                        key={plan.id}
                                        type="button"
                                        className={`px-3 py-2 rounded ${selectedPlanId === plan.id ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
                                        onClick={() => handleSelectPlan(plan.id)}
                                    >
                                        {plan.name}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className={`px-3 py-2 rounded ${selectedPlanId === null ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
                                    onClick={() => handleSelectPlan(null)}
                                >
                                    自定義增值
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 增值金額輸入 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 mb-2">儲值金額 (HK$)</label>
                            <input
                                type="number"
                                value={customTopUpAmount}
                                onChange={(e) => setCustomTopUpAmount(parseFloat(e.target.value) || 0)}
                                disabled={selectedPlanId !== null}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2">贈送金額 (HK$)</label>
                            <input
                                type="number"
                                value={customGiftAmount}
                                onChange={(e) => setCustomGiftAmount(parseFloat(e.target.value) || 0)}
                                disabled={selectedPlanId !== null}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold">
                            總增值金額: HK$ {customTopUpAmount + customGiftAmount}
                        </div>
                        <button
                            onClick={handleTopUp}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? '處理中...' : '確認增值'}
                        </button>
                    </div>
                </div>
            )}

            {/* 消費表單 */}
            {actionType === 'spend' && (
                <div className="bg-red-50 rounded-lg p-6 border border-red-100">
                    <h3 className="text-lg font-semibold mb-4">會員消費</h3>

                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">消費金額 (HK$)</label>
                        <input
                            type="number"
                            value={spendAmount}
                            onChange={(e) => setSpendAmount(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSpend}
                            disabled={loading}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? '處理中...' : '確認消費'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
} 