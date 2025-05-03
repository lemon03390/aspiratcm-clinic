"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { getBackendUrl } from "../../../../libs/apiClient";
import { useConfirm } from "../../../components/Modal";
import { useToast } from "../../../components/Toast";

interface ReferralSource {
    id: number;
    name: string;
    code?: string;
    aliases?: string;
}

export default function ReferralManagementPage() {
    const [referralSources, setReferralSources] = useState<ReferralSource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [newReferralName, setNewReferralName] = useState("");
    const [selectedReferral, setSelectedReferral] = useState<ReferralSource | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [referralAliases, setReferralAliases] = useState<string>("");

    const { confirm, ConfirmDialog } = useConfirm();
    const { ToastContainer, success, error: showError } = useToast();

    useEffect(() => {
        fetchReferralSources();
    }, []);

    const fetchReferralSources = async () => {
        try {
            setIsLoading(true);
            const response = await axios.get(getBackendUrl("/settings/referral_source"));
            setReferralSources(response.data);
            setIsLoading(false);
        } catch (err) {
            console.error("獲取介紹人資料失敗:", err);
            setError("獲取介紹人資料失敗。請稍後再試。");
            setIsLoading(false);
        }
    };

    const fetchReferralDetails = async (referralId: number): Promise<ReferralSource | null> => {
        try {
            const response = await axios.get(getBackendUrl(`/settings/referral_source/${referralId}`));
            console.log("獲取介紹人詳細資料:", response.data);
            return response.data;
        } catch (err) {
            console.error("獲取介紹人詳細資料失敗:", err);
            return null;
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.trim() === "0000") {
            setIsAuthenticated(true);
            setError("");
        } else {
            setError("密碼錯誤，請輸入正確的密碼");
        }
    };

    const handleAddReferral = async () => {
        if (!newReferralName.trim()) {
            setError("請輸入介紹人名稱");
            return;
        }

        try {
            const payload = {
                name: newReferralName.trim(),
                category: "referral_source",
                aliases: null
            };

            const response = await axios.post(getBackendUrl("/settings/referral_source"), payload, {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 5000,
            });

            if (response.status === 200 || response.status === 201) {
                setNewReferralName("");
                fetchReferralSources();
                setError("");
                success("介紹人新增成功");
            } else {
                setError("新增介紹人失敗: 狀態碼 " + response.status);
            }
        } catch (err: any) {
            const detail = err?.response?.data?.detail || err.message || "未知錯誤";
            setError("新增介紹人失敗: " + detail);
            console.error("新增介紹人失敗:", err);
        }
    };

    const handleSelectReferral = async (referral: ReferralSource) => {
        try {
            setError("");

            const fullReferralDetails = await fetchReferralDetails(referral.id);

            if (fullReferralDetails) {
                setSelectedReferral(fullReferralDetails);
                setReferralAliases(fullReferralDetails.aliases || "");
            } else {
                setSelectedReferral({
                    ...referral
                });
                setReferralAliases(referral.aliases || "");
            }
        } catch (err) {
            console.error("選擇介紹人時出錯:", err);
            showError("無法獲取介紹人資料，請重試");
        }
    };

    const handleSaveReferral = async () => {
        if (!selectedReferral) {
            return;
        }

        try {
            setIsSubmitting(true);

            const referralData = {
                name: selectedReferral.name,
                category: "referral_source",
                aliases: referralAliases
            };

            console.log("即將發送 PUT 請求至", `${getBackendUrl("/settings/referral_source")}/${selectedReferral.id}`);
            console.log("請求 payload:", JSON.stringify(referralData, null, 2));

            const response = await axios.put(`${getBackendUrl("/settings/referral_source")}/${selectedReferral.id}`, referralData);

            console.log("更新介紹人成功:", response.data);

            fetchReferralSources();
            setSelectedReferral(null);
            success("介紹人資料已更新");
        } catch (error: any) {
            console.error("更新介紹人失敗:", error);
            if (error.response) {
                console.error("錯誤狀態:", error.response.status);
                console.error("錯誤詳情:", error.response.data);
            }
            showError(`更新介紹人失敗：${error.response?.data?.detail || error.message || "請稍後再試"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteReferral = async (referral: ReferralSource) => {
        try {
            confirm(
                `確定要刪除介紹人 ${referral.name} 嗎？`,
                "此操作無法復原",
                async () => {
                    try {
                        const response = await axios.delete(getBackendUrl(`/settings/referral_source/${referral.id}`));
                        if (response.status === 200) {
                            fetchReferralSources();
                            success("介紹人已成功刪除");
                        }
                    } catch (err: any) {
                        console.error("刪除介紹人失敗:", err);
                        showError(
                            `刪除介紹人失敗: ${err.response?.data?.detail || err.message || "未知錯誤"
                            }`
                        );
                    }
                },
                {
                    confirmText: "確認刪除",
                    cancelText: "取消",
                    confirmButtonColor: "red"
                }
            );
        } catch (err: any) {
            console.error("刪除介紹人對話框出錯:", err);
            showError(`操作失敗: ${err.message || "未知錯誤"}`);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">介紹人管理</h2>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-2">請輸入密碼：</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border p-2 rounded w-full"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1 italic">
                            提示：系統默認密碼為 0000
                        </p>
                    </div>
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            確認
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    if (isLoading) {
        return <div className="text-center py-8">載入中...</div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">介紹人管理</h2>
            <div className="space-y-6">
                <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold mb-2">新增介紹人</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newReferralName}
                            onChange={(e) => setNewReferralName(e.target.value)}
                            placeholder="請輸入介紹人名稱"
                            className="border p-2 rounded flex-1"
                        />
                        <button
                            onClick={handleAddReferral}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            新增
                        </button>
                    </div>
                    {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-2">介紹人列表</h3>
                    <div className="space-y-2">
                        {referralSources.length === 0 ? (
                            <p className="text-gray-500">尚無介紹人資料</p>
                        ) : (
                            referralSources.map((referral) => (
                                <div
                                    key={referral.id}
                                    className="flex items-center justify-between border p-3 rounded-md hover:bg-gray-50"
                                >
                                    <div>
                                        <span className="font-medium">{referral.name}</span>
                                        {referral.aliases && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                別名：{referral.aliases}
                                            </div>
                                        )}
                                        {referral.code && (
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                代碼：{referral.code}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-x-2">
                                        <button
                                            onClick={() => handleSelectReferral(referral)}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                                        >
                                            編輯
                                        </button>
                                        <button
                                            onClick={() => handleDeleteReferral(referral)}
                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                                        >
                                            刪除
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {selectedReferral && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96 max-w-full">
                        <h3 className="text-lg font-semibold mb-4">
                            編輯介紹人資料
                        </h3>
                        <div className="space-y-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    介紹人名稱
                                </label>
                                <input
                                    type="text"
                                    value={selectedReferral.name}
                                    onChange={(e) => setSelectedReferral({
                                        ...selectedReferral,
                                        name: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    別名（逗號分隔）
                                </label>
                                <input
                                    type="text"
                                    value={referralAliases}
                                    onChange={(e) => setReferralAliases(e.target.value)}
                                    placeholder="輸入別名，多個請用逗號分隔"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            {selectedReferral.code && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        代碼（唯讀）
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedReferral.code}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button
                                onClick={() => setSelectedReferral(null)}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                disabled={isSubmitting}
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveReferral}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "處理中..." : "確認"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ToastContainer />
            <ConfirmDialog />
        </div>
    );
} 