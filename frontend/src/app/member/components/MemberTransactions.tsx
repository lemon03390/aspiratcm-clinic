'use client';

import { useEffect, useState } from 'react';
import { getMemberTransactions } from '../services/memberService';
import { MemberTransaction } from '../types';

// 交易類型對應的中文名稱和顏色
const transactionTypeMap: Record<string, { label: string; color: string }> = {
    'Start': { label: '開通', color: 'bg-gray-100 text-gray-800' },
    'TopUp': { label: '增值', color: 'bg-blue-100 text-blue-800' },
    'Spend': { label: '消費', color: 'bg-red-100 text-red-800' }
};

// 針對TopUp1, TopUp2等特殊類型的處理函數
function getTransactionTypeInfo(type: string) {
    // 如果是已知類型直接返回
    if (transactionTypeMap[type]) {
        return transactionTypeMap[type];
    }

    // 處理TopUp1, TopUp2等計劃增值類型
    if (type.startsWith('TopUp')) {
        return { label: '計劃增值', color: 'bg-green-100 text-green-800' };
    }

    // 默認類型處理
    return { label: '其他', color: 'bg-gray-100 text-gray-800' };
}

interface MemberTransactionsProps {
    memberId: number;
}

export default function MemberTransactions({ memberId }: MemberTransactionsProps) {
    const [transactions, setTransactions] = useState<MemberTransaction[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            setError(null);

            try {
                const result = await getMemberTransactions(memberId, page, pageSize);
                setTransactions(result.logs);
                setTotal(result.total);
            } catch (err) {
                console.error('獲取交易記錄失敗:', err);
                setError('無法獲取交易記錄');
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [memberId, page, pageSize]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">交易記錄</h2>

            {loading ? (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
                    <p className="mt-2 text-gray-500">載入交易記錄中...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                    <p>{error}</p>
                </div>
            ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <p>無交易記錄</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        交易日期
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        類型
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        儲值金額
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        贈送金額
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        總金額
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        備註
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {transactions.map((transaction) => {
                                    const typeInfo = getTransactionTypeInfo(transaction.type);
                                    return (
                                        <tr key={transaction.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(transaction.created_at).toLocaleString('zh-TW')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {transaction.type === 'Spend'
                                                    ? <span className="text-red-600">-{transaction.amount}</span>
                                                    : transaction.amount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {transaction.type === 'Spend'
                                                    ? <span className="text-red-600">-{transaction.giftAmount}</span>
                                                    : transaction.giftAmount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {transaction.type === 'Spend'
                                                    ? <span className="text-red-600">-{transaction.amount + transaction.giftAmount}</span>
                                                    : transaction.amount + transaction.giftAmount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {transaction.description || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* 分頁 */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-4">
                            <div className="text-sm text-gray-700">
                                顯示 {transactions.length} 筆，共 {total} 筆交易
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handlePageChange(1)}
                                    disabled={page === 1}
                                    className={`px-3 py-1 rounded ${page === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    首頁
                                </button>
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className={`px-3 py-1 rounded ${page === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    上一頁
                                </button>
                                <span className="px-3 py-1 bg-blue-500 text-white rounded">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === totalPages}
                                    className={`px-3 py-1 rounded ${page === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    下一頁
                                </button>
                                <button
                                    onClick={() => handlePageChange(totalPages)}
                                    disabled={page === totalPages}
                                    className={`px-3 py-1 rounded ${page === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    末頁
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
} 