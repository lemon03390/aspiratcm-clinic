"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import { TagType } from '../../components/PatientTags';

interface Tag {
    id: number;
    name: string;
    description: string | null;
    color: string;
    icon: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface TagFormData {
    name: string;
    description: string;
    color: string;
    icon: string;
}

const colorOptions = [
    { value: "red", label: "紅色", bgClass: "bg-red-100", textClass: "text-red-800", borderClass: "border-red-200" },
    { value: "yellow", label: "黃色", bgClass: "bg-yellow-100", textClass: "text-yellow-800", borderClass: "border-yellow-200" },
    { value: "blue", label: "藍色", bgClass: "bg-blue-100", textClass: "text-blue-800", borderClass: "border-blue-200" },
    { value: "green", label: "綠色", bgClass: "bg-green-100", textClass: "text-green-800", borderClass: "border-green-200" },
    { value: "purple", label: "紫色", bgClass: "bg-purple-100", textClass: "text-purple-800", borderClass: "border-purple-200" },
    { value: "indigo", label: "靛藍", bgClass: "bg-indigo-100", textClass: "text-indigo-800", borderClass: "border-indigo-200" },
    { value: "gray", label: "灰色", bgClass: "bg-gray-100", textClass: "text-gray-800", borderClass: "border-gray-200" },
];

const iconOptions = [
    { value: "warning", label: "警告" },
    { value: "virus", label: "病毒" },
    { value: "info", label: "資訊" },
    { value: "star", label: "星星" },
    { value: "flag", label: "旗幟" },
    { value: "note", label: "備註" },
];

export default function TagManagementPage() {
    const [tags, setTags] = useState<TagType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingTag, setEditingTag] = useState<TagType | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newTag, setNewTag] = useState<Partial<TagType>>({
        name: '',
        description: '',
        color: 'blue',
        icon: '',
        is_active: true
    });

    const fetchTags = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/v1/tag-settings');
            setTags(response.data);
            setError(null);
        } catch (err) {
            console.error('載入標籤失敗:', err);
            setError('無法載入標籤數據');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    const handleEditTag = (tag: TagType) => {
        setEditingTag(tag);
        setIsCreating(false);
    };

    const handleCancelEdit = () => {
        setEditingTag(null);
        setIsCreating(false);
    };

    const handleUpdateTag = async () => {
        if (!editingTag) {
            return;
        }

        try {
            await axios.put(`/api/v1/tag-settings/${editingTag.id}`, editingTag);
            fetchTags();
            setEditingTag(null);
        } catch (err) {
            console.error('更新標籤失敗:', err);
            setError('更新標籤失敗');
        }
    };

    const handleCreateTag = () => {
        setEditingTag(null);
        setIsCreating(true);
    };

    const handleSaveNewTag = async () => {
        try {
            await axios.post('/api/v1/tag-settings', newTag);
            fetchTags();
            setIsCreating(false);
            setNewTag({
                name: '',
                description: '',
                color: 'blue',
                icon: '',
                is_active: true
            });
        } catch (err) {
            console.error('創建標籤失敗:', err);
            setError('創建標籤失敗');
        }
    };

    const handleDeleteTag = async (tagId: number) => {
        if (!confirm('確定要刪除這個標籤嗎？這將影響所有使用此標籤的預約。')) {
            return;
        }

        try {
            await axios.delete(`/api/v1/tag-settings/${tagId}`);
            fetchTags();
        } catch (err) {
            console.error('刪除標籤失敗:', err);
            setError('刪除標籤失敗');
        }
    };

    const getTagColorClass = (color: string) => {
        const colorMap: { [key: string]: string } = {
            blue: 'bg-blue-100 text-blue-800',
            red: 'bg-red-100 text-red-800',
            green: 'bg-green-100 text-green-800',
            yellow: 'bg-yellow-100 text-yellow-800',
            orange: 'bg-orange-100 text-orange-800',
            purple: 'bg-purple-100 text-purple-800',
            indigo: 'bg-indigo-100 text-indigo-800',
            pink: 'bg-pink-100 text-pink-800',
            gray: 'bg-gray-100 text-gray-800',
        };
        return colorMap[color] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return <div className="p-8 text-center">載入標籤中...</div>;
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">標籤管理</h1>
                <button
                    onClick={handleCreateTag}
                    className="px-4 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700"
                >
                    新增標籤
                </button>
            </div>

            {error && (
                <div className="bg-red-100 text-red-800 p-4 rounded mb-6">
                    {error}
                </div>
            )}

            {isCreating && (
                <div className="mb-8 p-6 bg-gray-50 rounded shadow">
                    <h2 className="text-xl font-bold mb-4">新增標籤</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">標籤名稱</label>
                            <input
                                type="text"
                                value={newTag.name}
                                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                            <input
                                type="text"
                                value={newTag.description || ''}
                                onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">顏色</label>
                            <select
                                value={newTag.color}
                                onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                            >
                                {colorOptions.map(color => (
                                    <option key={color.value} value={color.value}>{color.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">圖示</label>
                            <input
                                type="text"
                                value={newTag.icon || ''}
                                onChange={(e) => setNewTag({ ...newTag, icon: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                                placeholder="例如: 🔖, 🏷️, ⚠️"
                            />
                        </div>
                        <div className="md:col-span-2 flex items-center">
                            <input
                                type="checkbox"
                                id="new-is-active"
                                checked={newTag.is_active}
                                onChange={(e) => setNewTag({ ...newTag, is_active: e.target.checked })}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            />
                            <label htmlFor="new-is-active" className="ml-2 text-sm text-gray-700">
                                啟用標籤
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-4">
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSaveNewTag}
                            className="px-4 py-2 bg-green-600 text-white rounded"
                            disabled={!newTag.name}
                        >
                            保存
                        </button>
                    </div>
                </div>
            )}

            {editingTag && (
                <div className="mb-8 p-6 bg-gray-50 rounded shadow">
                    <h2 className="text-xl font-bold mb-4">編輯標籤</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">標籤名稱</label>
                            <input
                                type="text"
                                value={editingTag.name}
                                onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                            <input
                                type="text"
                                value={editingTag.description || ''}
                                onChange={(e) => setEditingTag({ ...editingTag, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">顏色</label>
                            <select
                                value={editingTag.color}
                                onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                            >
                                {colorOptions.map(color => (
                                    <option key={color.value} value={color.value}>{color.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">圖示</label>
                            <input
                                type="text"
                                value={editingTag.icon || ''}
                                onChange={(e) => setEditingTag({ ...editingTag, icon: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                                placeholder="例如: 🔖, 🏷️, ⚠️"
                            />
                        </div>
                        <div className="md:col-span-2 flex items-center">
                            <input
                                type="checkbox"
                                id="edit-is-active"
                                checked={editingTag.is_active}
                                onChange={(e) => setEditingTag({ ...editingTag, is_active: e.target.checked })}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            />
                            <label htmlFor="edit-is-active" className="ml-2 text-sm text-gray-700">
                                啟用標籤
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-4">
                        <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleUpdateTag}
                            className="px-4 py-2 bg-green-600 text-white rounded"
                            disabled={!editingTag.name}
                        >
                            保存
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                標籤名稱
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                描述
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                狀態
                            </th>
                            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {tags.map(tag => (
                            <tr key={tag.id}>
                                <td className="py-3 px-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getTagColorClass(tag.color)}`}>
                                        {tag.icon || '🏷️'} {tag.name}
                                    </span>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">{tag.description || '-'}</td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                    {tag.is_active ? (
                                        <span className="px-2 py-1 text-xs font-medium rounded-md bg-green-100 text-green-800">
                                            啟用
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-800">
                                            停用
                                        </span>
                                    )}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap text-right text-sm">
                                    <button
                                        onClick={() => handleEditTag(tag)}
                                        className="text-indigo-600 hover:text-indigo-800 mr-4"
                                    >
                                        編輯
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTag(tag.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        刪除
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {tags.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-gray-500">
                                    沒有找到標籤
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
} 