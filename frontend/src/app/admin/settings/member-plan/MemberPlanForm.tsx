'use client';

import { FormEvent, useState } from 'react';
import { createMemberPlan, deleteMemberPlan, updateMemberPlan } from '../../../member/services/memberService';
import { MemberPlan } from '../../../member/types';

interface MemberPlanFormProps {
    plan: MemberPlan | null;
    onClose: () => void;
    onSaveSuccess: () => void;
}

export default function MemberPlanForm({ plan, onClose, onSaveSuccess }: MemberPlanFormProps) {
    const [formData, setFormData] = useState({
        name: plan?.name || '',
        description: plan?.description || '',
        base_amount: plan?.base_amount || 0,
        bonus_amount: plan?.bonus_amount || 0,
        is_active: plan?.is_active ?? true,
        sort_order: plan?.sort_order || 0
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox'
                ? (e.target as HTMLInputElement).checked
                : type === 'number'
                    ? parseFloat(value) || 0
                    : value
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (plan) {
                // 更新現有計劃
                await updateMemberPlan(plan.id, formData);
            } else {
                // 創建新計劃
                await createMemberPlan(formData);
            }
            onSaveSuccess();
        } catch (err) {
            console.error('保存增值計劃失敗:', err);
            setError(err instanceof Error ? err.message : '操作失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!plan) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await deleteMemberPlan(plan.id);
            onSaveSuccess();
        } catch (err) {
            console.error('刪除增值計劃失敗:', err);
            setError(err instanceof Error ? err.message : '刪除失敗');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
                    <p>{error}</p>
                </div>
            )}

            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                    計劃名稱
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="例如：基本增值計劃"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
            </div>

            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                    計劃描述
                </label>
                <textarea
                    id="description"
                    name="description"
                    placeholder="例如：增值$1000獲贈$100"
                    value={formData.description}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows={2}
                />
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="base_amount">
                        儲值金額 (HK$)
                    </label>
                    <input
                        id="base_amount"
                        name="base_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.base_amount}
                        onChange={handleChange}
                        required
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>

                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="bonus_amount">
                        贈送金額 (HK$)
                    </label>
                    <input
                        id="bonus_amount"
                        name="bonus_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.bonus_amount}
                        onChange={handleChange}
                        required
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sort_order">
                    顯示順序（數字越小越靠前）
                </label>
                <input
                    id="sort_order"
                    name="sort_order"
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
            </div>

            <div className="mb-6">
                <label className="flex items-center">
                    <input
                        id="is_active"
                        name="is_active"
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    <span className="text-gray-700">啟用此計劃（前台可見）</span>
                </label>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? '處理中...' : plan ? '更新計劃' : '新增計劃'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                        取消
                    </button>
                </div>

                {plan && !confirmDelete && (
                    <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                        刪除計劃
                    </button>
                )}

                {plan && confirmDelete && (
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            確認刪除
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            取消
                        </button>
                    </div>
                )}
            </div>
        </form>
    );
} 