'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMember, updateMember } from '../services/memberService';
import { Member, MemberFormData } from '../types';

interface MemberEditFormProps {
    memberId: number;
}

export default function MemberEditForm({ memberId }: MemberEditFormProps) {
    const [member, setMember] = useState<Member | null>(null);
    const [formData, setFormData] = useState<MemberFormData>({
        patientName: '',
        phoneNumber: '',
        contactAddress: '',
        hkid: '',
        termsConsent: false,
        haveCard: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const router = useRouter();

    useEffect(() => {
        const fetchMember = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await getMember(memberId);
                setMember(data);
                // 設置表單初始值
                setFormData({
                    patientName: data.patientName || '',
                    phoneNumber: data.phoneNumber || '',
                    contactAddress: data.contactAddress || '',
                    hkid: data.hkid || '',
                    termsConsent: data.termsConsent || false,
                    haveCard: data.haveCard || false
                });
            } catch (err) {
                console.error('獲取會員資料失敗:', err);
                setError(err instanceof Error ? err.message : '獲取會員資料失敗');
            } finally {
                setLoading(false);
            }
        };

        fetchMember();
    }, [memberId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            await updateMember(memberId, formData);
            setSuccess('會員資料更新成功');
            // 3秒後返回會員詳情頁
            setTimeout(() => {
                router.push(`/member/${memberId}`);
            }, 3000);
        } catch (err) {
            console.error('更新會員失敗:', err);
            setError(err instanceof Error ? err.message : '更新會員資料失敗');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">正在載入會員資料...</p>
            </div>
        );
    }

    if (error && !member) {
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

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">編輯會員資料</h1>
                <button
                    onClick={() => router.push(`/member/${memberId}`)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                    返回會員詳情
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
                    <p>{success}</p>
                    <p className="text-sm mt-1">三秒後自動返回會員詳情頁...</p>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2" htmlFor="patientName">
                                會員姓名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="patientName"
                                name="patientName"
                                value={formData.patientName}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2" htmlFor="phoneNumber">
                                電話號碼
                            </label>
                            <input
                                type="text"
                                id="phoneNumber"
                                name="phoneNumber"
                                value={formData.phoneNumber || ''}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2" htmlFor="hkid">
                                身份證號碼
                            </label>
                            <input
                                type="text"
                                id="hkid"
                                name="hkid"
                                value={formData.hkid || ''}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-gray-700 font-medium mb-2" htmlFor="contactAddress">
                                聯絡地址
                            </label>
                            <textarea
                                id="contactAddress"
                                name="contactAddress"
                                value={formData.contactAddress || ''}
                                onChange={handleChange}
                                rows={3}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="termsConsent"
                                name="termsConsent"
                                checked={formData.termsConsent}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="termsConsent" className="ml-2 block text-gray-700">
                                已簽署同意書
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="haveCard"
                                name="haveCard"
                                checked={formData.haveCard}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="haveCard" className="ml-2 block text-gray-700">
                                已持有會員卡
                            </label>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            onClick={() => router.push(`/member/${memberId}`)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded mr-2 hover:bg-gray-300"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                        >
                            {saving ? '保存中...' : '保存變更'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 