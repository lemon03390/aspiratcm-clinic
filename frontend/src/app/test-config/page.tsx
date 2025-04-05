"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getBackendUrl } from '../../libs/apiClient';

export default function TestConfigPage() {
  const [configData, setConfigData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/v1/test-api-config');
        setConfigData(response.data.config);
        setError(null);
      } catch (err: any) {
        setError(err.message || '獲取配置數據失敗');
        console.error('獲取配置數據錯誤:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigData();
  }, []);

  const handleTestConnection = async () => {
    try {
      setTestLoading(true);
      const response = await axios.get(getBackendUrl('/doctors'));
      setTestResult({
        success: true,
        message: '連接後端成功',
        data: response.data,
        status: response.status
      });
    } catch (err: any) {
      console.error('測試連接失敗:', err);
      setTestResult({
        success: false,
        message: '連接後端失敗',
        error: err.message,
        response: err.response?.data
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">API 配置測試</h1>
        
        {loading ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-500">正在載入配置數據...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-6 rounded-lg shadow-md border border-red-200">
            <h2 className="text-red-600 font-semibold mb-2">載入失敗</h2>
            <p className="text-red-700">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">環境變數</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-md p-4 bg-gray-50">
                  <h3 className="font-medium mb-2">NEXT_PUBLIC_API_BASE_URL</h3>
                  <div className="bg-black rounded-md text-green-400 font-mono p-3 text-sm break-all">
                    {configData?.processEnv.NEXT_PUBLIC_API_BASE_URL || '未設置'}
                  </div>
                </div>
                <div className="border rounded-md p-4 bg-gray-50">
                  <h3 className="font-medium mb-2">NODE_ENV</h3>
                  <div className="bg-black rounded-md text-yellow-400 font-mono p-3 text-sm">
                    {configData?.processEnv.NODE_ENV || '未設置'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">API URL 生成測試</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="py-2 px-4 text-left">路徑</th>
                      <th className="py-2 px-4 text-left">生成的 URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configData && Object.entries(configData.apiUrls).map(([path, url]) => (
                      <tr key={path} className="border-b">
                        <td className="py-2 px-4 font-mono">{path}</td>
                        <td className="py-2 px-4 font-mono text-blue-600 break-all">{url as string}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">後端連接測試</h2>
              <button
                onClick={handleTestConnection}
                disabled={testLoading}
                className={`px-4 py-2 rounded-md text-white ${
                  testLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {testLoading ? '測試中...' : '測試連接後端'}
              </button>

              {testResult && (
                <div className={`mt-4 p-4 rounded-md ${
                  testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <h3 className={`font-semibold ${
                    testResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {testResult.message}
                  </h3>
                  {testResult.success ? (
                    <div className="mt-2">
                      <p className="text-green-700">狀態碼: {testResult.status}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-green-800 hover:text-green-600">顯示返回數據</summary>
                        <pre className="mt-2 p-3 bg-black text-green-400 rounded-md overflow-auto text-xs">
                          {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-red-700">錯誤: {testResult.error}</p>
                      {testResult.response && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-red-800 hover:text-red-600">顯示錯誤詳情</summary>
                          <pre className="mt-2 p-3 bg-black text-red-400 rounded-md overflow-auto text-xs">
                            {JSON.stringify(testResult.response, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 