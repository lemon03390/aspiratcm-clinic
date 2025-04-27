import React, { useState } from 'react';

interface SpecialMarkerEditorProps {
    isTroublesome: number;
    isContagious: number;
    specialNote: string;
    onUpdate: (markers: {
        is_troublesome: number;
        is_contagious: number;
        special_note: string;
    }) => void;
}

const SpecialMarkerEditor: React.FC<SpecialMarkerEditorProps> = ({
    isTroublesome = 0,
    isContagious = 0,
    specialNote = '',
    onUpdate
}) => {
    const [troublesome, setTroublesome] = useState(isTroublesome === 1);
    const [contagious, setContagious] = useState(isContagious === 1);
    const [note, setNote] = useState(specialNote || '');

    const handleSubmit = () => {
        onUpdate({
            is_troublesome: troublesome ? 1 : 0,
            is_contagious: contagious ? 1 : 0,
            special_note: note
        });
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">特殊患者標記</h3>

            <div className="mb-4">
                <div className="flex items-center mb-2">
                    <input
                        type="checkbox"
                        id="troublesome"
                        checked={troublesome}
                        onChange={(e) => setTroublesome(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="troublesome" className="ml-2 text-sm font-medium text-gray-700">
                        特殊情況患者
                    </label>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="contagious"
                        checked={contagious}
                        onChange={(e) => setContagious(e.target.checked)}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <label htmlFor="contagious" className="ml-2 text-sm font-medium text-gray-700">
                        傳染病風險
                    </label>
                </div>
            </div>

            <div className="mb-4">
                <label htmlFor="specialNote" className="block text-sm font-medium text-gray-700 mb-1">
                    特殊註記
                </label>
                <textarea
                    id="specialNote"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="輸入特殊情況註記..."
                />
            </div>

            <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                更新標記
            </button>
        </div>
    );
};

export default SpecialMarkerEditor;
