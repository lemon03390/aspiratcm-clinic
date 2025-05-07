'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMembers } from '../services/memberService';
import { Member } from '../types';

// 格式化日期函數
function formatDate(date: string | Date | null | undefined): string {
    if (!date) {
        return '-';
    }
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
        return '-';
    }
    return d.toLocaleDateString('zh-TW');
}

const MemberClient = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [importMode, setImportMode] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [importMessage, setImportMessage] = useState('');

    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // 從 URL 參數設置初始狀態
        const pageParam = searchParams.get('page');
        const searchParam = searchParams.get('search');
        const modeParam = searchParams.get('mode');

        if (pageParam) {
            setPage(parseInt(pageParam));
        }

        if (searchParam) {
            setSearch(searchParam);
            setSearchInput(searchParam);
        }

        if (modeParam === 'import') {
            setImportMode(true);
        } else {
            loadMembers(pageParam ? parseInt(pageParam) : 1, searchParam || '');
        }
    }, [searchParams]);

    const loadMembers = async (currentPage: number, searchTerm: string) => {
        setLoading(true);
        try {
            const data = await getMembers(currentPage, pageSize, searchTerm);
            setMembers(data.items);
            setTotal(data.total);
        } catch (error) {
            console.error('獲取會員列表失敗', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);

        const params = new URLSearchParams();
        if (searchInput) {
            params.append('search', searchInput);
        }
        params.append('page', '1');

        router.push(`/member?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);

        const params = new URLSearchParams();
        if (search) {
            params.append('search', search);
        }
        params.append('page', newPage.toString());

        router.push(`/member?${params.toString()}`);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setCsvFile(e.target.files[0]);
        }
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!csvFile) {
            setImportMessage('請選擇CSV檔案');
            return;
        }

        setImportStatus('loading');
        setImportMessage('正在處理導入...');

        const formData = new FormData();
        formData.append('file', csvFile);

        try {
            console.log('開始提交會員導入請求...');

            // 修改：添加更多調試信息，防止超時
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超時

            // 使用新的API端點
            const response = await fetch('/api/v1/file/membership/import', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('收到導入請求響應:', response.status, response.statusText);

            let result;
            try {
                result = await response.json();
                console.log('導入結果:', result);
            } catch (parseError) {
                const text = await response.text();
                console.error('無法解析響應為JSON:', text);
                throw new Error('伺服器響應格式錯誤');
            }

            if (response.ok) {
                setImportStatus('success');
                setImportMessage(`成功導入會員資料`);
                // 3秒後重新載入頁面
                setTimeout(() => {
                    router.push('/member');
                }, 3000);
            } else {
                setImportStatus('error');
                setImportMessage(`導入失敗: ${result.detail || result.error || '未知錯誤'}`);
            }
        } catch (error) {
            console.error('會員導入失敗:', error);
            setImportStatus('error');
            setImportMessage(`導入過程中發生錯誤: ${error instanceof Error ? error.message : '請檢查檔案格式是否正確'}`);
        }
    };

    const cancelImport = () => {
        router.push('/member');
    };

    const totalPages = Math.ceil(total / pageSize);

    // 渲染批量導入介面
    if (importMode) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">批量導入會員</h1>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="mb-6">
                        <h2 className="text-lg font-medium mb-2">導入說明</h2>
                        <ul className="list-disc pl-5 text-gray-600">
                            <li>請使用CSV格式檔案</li>
                            <li>檔案必須包含表頭，並至少包含：patientName 欄位</li>
                            <li>可選欄位：phoneNumber, hkid, contactAddress, termsConsent, haveCard</li>
                            <li>同意書狀態(termsConsent)和持卡狀態(haveCard)請使用：是/否、true/false或1/0</li>
                        </ul>
                    </div>

                    <form onSubmit={handleImport}>
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2" htmlFor="csv-file">
                                選擇CSV檔案
                            </label>
                            <input
                                type="file"
                                id="csv-file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="block w-full text-gray-700 border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {importStatus === 'idle' && (
                            <div className="flex space-x-3">
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                >
                                    開始導入
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelImport}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    取消
                                </button>
                            </div>
                        )}

                        {importStatus === 'loading' && (
                            <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                                <p className="text-gray-600">{importMessage}</p>
                            </div>
                        )}

                        {importStatus === 'success' && (
                            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
                                <div className="flex">
                                    <svg className="h-6 w-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>{importMessage}</span>
                                </div>
                                <p className="mt-2 text-sm">三秒後自動返回會員列表...</p>
                            </div>
                        )}

                        {importStatus === 'error' && (
                            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
                                <div className="flex">
                                    <svg className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>{importMessage}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setImportStatus('idle')}
                                    className="mt-3 px-4 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                >
                                    重試
                                </button>
                            </div>
                        )}
                    </form>

                    <div className="mt-8 border-t pt-6">
                        <h3 className="text-lg font-medium mb-3">CSV範例檔案格式</h3>
                        <div className="bg-gray-50 p-3 rounded border border-gray-200 overflow-auto">
                            <pre className="text-xs text-gray-600">patientName,phoneNumber,hkid,contactAddress,termsConsent,haveCard
                                張三,0912345678,A123456789,九龍區XX街XX號,true,true
                                李四,0923456789,B123456789,香港區XX街XX號,false,true
                                王五,0934567890,,新界區XX街XX號,true,false</pre>
                        </div>
                        <div className="flex mt-3 space-x-3">
                            <a
                                href="/data/member_import_template.csv"
                                download
                                className="inline-block text-blue-600 hover:underline text-sm"
                            >
                                下載範例CSV檔案
                            </a>

                            <button
                                type="button"
                                onClick={() => {
                                    // 模擬上傳預設的CSV模板
                                    fetch('/data/member_import_template.csv')
                                        .then(res => res.blob())
                                        .then(blob => {
                                            const file = new File([blob], 'member_import_template.csv', { type: 'text/csv' });
                                            setCsvFile(file);
                                            setImportMessage('已選擇範例CSV檔案，您可以點擊「開始導入」按鈕進行導入');
                                        })
                                        .catch(err => {
                                            console.error('獲取範例文件失敗:', err);
                                            setImportMessage('無法獲取範例檔案');
                                        });
                                }}
                                className="text-sm text-green-600 hover:underline"
                            >
                                使用此範例文件
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">會員管理</h1>

            {/* 搜尋框和操作按鈕 */}
            <div className="flex flex-col md:flex-row justify-between mb-6">
                <form onSubmit={handleSearch} className="mb-4 md:mb-0 md:flex-1 md:mr-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="搜尋會員姓名或電話"
                            className="flex-grow px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            搜尋
                        </button>
                    </div>
                </form>
                <div className="flex gap-2">
                    <Link
                        href="/member/new"
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        新增會員
                    </Link>
                    <Link
                        href="/member?mode=import"
                        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        批量導入
                    </Link>
                </div>
            </div>

            {/* 會員列表 */}
            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                姓名
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                電話
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                性別
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                出生日期
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                持卡狀態
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                同意書簽署
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center">
                                    載入中...
                                </td>
                            </tr>
                        ) : members.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center">
                                    沒有找到會員資料
                                </td>
                            </tr>
                        ) : (
                            members.map((member) => (
                                <tr key={member.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {member.patientName || member.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {member.phoneNumber || member.phone || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {member.gender || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(member.dob)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.haveCard || member.has_card ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {member.haveCard || member.has_card ? '已持有' : '未持有'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.termsConsent || member.has_signed_consent_form ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {member.termsConsent || member.has_signed_consent_form ? '已簽署' : '未簽署'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => router.push(`/member/${member.id}`)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                詳細資料
                                            </button>
                                            <button
                                                onClick={() => router.push(`/member/edit/${member.id}`)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                編輯
                                            </button>
                                            <button
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                刪除
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 分頁 */}
            {totalPages > 0 && (
                <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-700">
                        顯示 {members.length} 筆，共 {total} 筆資料
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => handlePageChange(1)}
                            disabled={page === 1}
                            className={`px-3 py-1 rounded ${page === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            首頁
                        </button>
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className={`px-3 py-1 rounded ${page === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            上一頁
                        </button>
                        <span className="px-3 py-1 bg-blue-500 text-white rounded">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === totalPages}
                            className={`px-3 py-1 rounded ${page === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            下一頁
                        </button>
                        <button
                            onClick={() => handlePageChange(totalPages)}
                            disabled={page === totalPages}
                            className={`px-3 py-1 rounded ${page === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            末頁
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemberClient; 