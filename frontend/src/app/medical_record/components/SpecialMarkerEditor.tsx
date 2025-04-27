import React, { useState } from 'react';

interface SpecialMarkerEditorProps {
    isContagious: boolean;
    isTroublesome: boolean;
    specialNote: string;
    onSave: (data: { isContagious: boolean; isTroublesome: boolean; specialNote: string }) => void;
    onCancel?: () => void;
}

const SpecialMarkerEditor: React.FC<SpecialMarkerEditorProps> = ({
    isContagious,
    isTroublesome,
    specialNote,
    onSave,
    onCancel
}) => {
    const [localIsContagious, setLocalIsContagious] = useState<boolean>(isContagious);
    const [localIsTroublesome, setLocalIsTroublesome] = useState<boolean>(isTroublesome);
    const [localSpecialNote, setLocalSpecialNote] = useState<string>(specialNote || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            isContagious: localIsContagious,
            isTroublesome: localIsTroublesome,
            specialNote: localSpecialNote
        });
    };

    return (
        <div className="bg-white p-4 rounded-md shadow-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">特殊患者標記</h3>

            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isContagious"
                            checked={localIsContagious}
                            onChange={(e) => setLocalIsContagious(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isContagious" className="text-sm font-medium text-gray-700">
                            傳染病患者
                        </label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isTroublesome"
                            checked={localIsTroublesome}
                            onChange={(e) => setLocalIsTroublesome(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isTroublesome" className="text-sm font-medium text-gray-700">
                            麻煩症患者
                        </label>
                    </div>

                    <div>
                        <label htmlFor="specialNote" className="block text-sm font-medium text-gray-700">
                            特殊情況註記
                        </label>
                        <textarea
                            id="specialNote"
                            value={localSpecialNote}
                            onChange={(e) => setLocalSpecialNote(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="請輸入需要特別注意的情況..."
                        />
                    </div>

                    <div className="flex justify-end space-x-2">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                取消
                            </button>
                        )}
                        <button
                            type="submit"
                            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            保存
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default SpecialMarkerEditor; 