'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createMember } from '../services/memberService';
import { MemberFormData } from '../types';

const NewMemberForm = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState<MemberFormData>({
        patientName: '',
        phoneNumber: '',
        hkid: '',
        contactAddress: '',
        termsConsent: false,
        haveCard: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 使用服務函數來創建會員
            await createMember(formData);
            // 導航到會員列表頁面
            router.push('/member');
        } catch (err: any) {
            setError(err.message || '建立會員時發生未知錯誤');
            console.error('建立會員失敗:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="patientName">
                            姓名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="patientName"
                            name="patientName"
                            type="text"
                            required
                            value={formData.patientName}
                            onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phoneNumber">
                            電話
                        </label>
                        <input
                            id="phoneNumber"
                            name="phoneNumber"
                            type="text"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="hkid">
                            身份證號碼
                        </label>
                        <input
                            id="hkid"
                            name="hkid"
                            type="text"
                            value={formData.hkid}
                            onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="contactAddress">
                            聯絡地址
                        </label>
                        <textarea
                            id="contactAddress"
                            name="contactAddress"
                            value={formData.contactAddress}
                            onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            rows={3}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="termsConsent"
                                checked={formData.termsConsent}
                                onChange={handleChange}
                                className="mr-2"
                            />
                            <span className="text-gray-700 text-sm font-bold">已簽署同意書</span>
                        </label>
                    </div>

                    <div className="mb-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="haveCard"
                                checked={formData.haveCard}
                                onChange={handleChange}
                                className="mr-2"
                            />
                            <span className="text-gray-700 text-sm font-bold">已持有會員卡</span>
                        </label>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                    <button
                        type="button"
                        onClick={() => router.push('/member')}
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {loading ? '處理中...' : '儲存'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewMemberForm; 