'use client';

import axios from 'axios';
import React, { useEffect, useState } from 'react';

export interface TagType {
    id: number;
    name: string;
    description?: string;
    color: string;
    icon?: string;
    is_active: boolean;
}

interface PatientTagsProps {
    selectedTags: number[];
    onChange: (tags: number[]) => void;
    onTagsLoaded?: (tags: TagType[]) => void;
}

const PatientTags: React.FC<PatientTagsProps> = ({ selectedTags, onChange, onTagsLoaded }) => {
    const [tags, setTags] = useState<TagType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 加載所有標籤
    useEffect(() => {
        const fetchTags = async () => {
            setLoading(true);
            try {
                // 添加時間戳防止快取
                const response = await axios.get(`/api/v1/tag-settings?_t=${Date.now()}`, {
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                console.log('載入標籤回應:', response.data);

                // 只顯示啟用的標籤
                const activeTags = response.data.filter((tag: TagType) => tag.is_active);
                setTags(activeTags);
                if (onTagsLoaded) {
                    onTagsLoaded(activeTags);
                }
                setError(null);
            } catch (err) {
                console.error('載入標籤失敗:', err);
                setError('無法載入患者標籤');
            } finally {
                setLoading(false);
            }
        };

        fetchTags();
    }, [onTagsLoaded]);

    const handleTagToggle = (tagId: number) => {
        if (selectedTags.includes(tagId)) {
            onChange(selectedTags.filter(id => id !== tagId));
        } else {
            onChange([...selectedTags, tagId]);
        }
    };

    // 獲取標籤顏色CSS類別
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

    // 獲取標籤圖示
    const getTagIcon = (tag: TagType) => {
        if (tag.icon) {
            return tag.icon;
        }

        // 預設圖示
        if (tag.name.includes('首次')) {
            return '🔰';
        }
        if (tag.name.includes('麻煩')) {
            return '⚠️';
        }
        if (tag.name.includes('傳染')) {
            return '☣️';
        }
        return '🏷️';
    };

    if (loading) {
        return <div className="text-gray-500 text-sm">載入標籤中...</div>;
    }

    if (error) {
        return <div className="text-red-500 text-sm">載入標籤失敗</div>;
    }

    // 沒有標籤時顯示提示
    if (tags.length === 0) {
        return <div className="text-gray-500">沒有可用的標籤，請先在標籤管理中創建標籤</div>;
    }

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">患者標記</label>
            <div className="flex flex-wrap gap-3">
                {tags.map(tag => (
                    <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagToggle(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium 
              ${getTagColorClass(tag.color)} 
              ${selectedTags.includes(tag.id) ? 'ring-2 ring-offset-1 ring-blue-500' : ''}
              transition-all hover:opacity-90`}
                        title={tag.description || tag.name}
                    >
                        {getTagIcon(tag)} {tag.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PatientTags; 