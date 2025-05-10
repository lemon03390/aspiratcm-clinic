'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMemberPlans } from '../../../member/services/memberService';
import { MemberPlan } from '../../../member/types';

export default function MemberPlanManagement() {
    const [plans, setPlans] = useState<MemberPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState<MemberPlan | null>(null);

    const router = useRouter();

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await getMemberPlans(); // 獲取所有計劃，包括未啟用的
            setPlans(result.items);
        } catch (err) {
            console.error('獲取增值計劃失敗:', err);
            setError('無法獲取增值計劃');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNew = () => {
        setEditingPlan(null);
        setShowForm(true);
    };

    const handleEdit = (plan: MemberPlan) => {
        setEditingPlan(plan);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingPlan(null);
    };

    const handleSaveSuccess = () => {
        setShowForm(false);
        setEditingPlan(null);
        loadPlans(); // 重新載入計劃列表
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
                </div>
                <p className="mt-4 text-gray-600">正在載入增值計劃資料...</p>
            </div>
        );
    }

    // 動態導入表單組件
    const MemberPlanForm = require('./MemberPlanForm').default;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">會員增值計劃管理</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={handleAddNew}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        新增計劃
                    </button>
                    <button
                        onClick={() => router.push('/admin/settings')}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                        返回設置
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
                    <p>{error}</p>
                </div>
            )}

            {/* 計劃列表 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                計劃名稱
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                儲值金額 (HK$)
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                贈送金額 (HK$)
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                總金額 (HK$)
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                狀態
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                顯示順序
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {plans.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                    尚未設置增值計劃
                                </td>
                            </tr>
                        ) : (
                            plans.map(plan => (
                                <tr key={plan.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {plan.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {plan.base_amount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {plan.bonus_amount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {plan.base_amount + plan.bonus_amount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {plan.is_active ? '啟用中' : '已停用'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {plan.sort_order}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(plan)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                        >
                                            編輯
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 彈出式表單 */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            {editingPlan ? '編輯增值計劃' : '新增增值計劃'}
                        </h2>
                        <MemberPlanForm
                            plan={editingPlan}
                            onClose={handleFormClose}
                            onSaveSuccess={handleSaveSuccess}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}