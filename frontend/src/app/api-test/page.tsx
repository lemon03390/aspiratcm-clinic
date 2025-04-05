"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_TEST_ENDPOINTS = [
  { name: '前端測試API', url: '/api/v1/test' },
  { name: '前端測試API (後端連接)', url: '/api/v1/test?endpoint=backend' },
  { name: '預約API (GET)', url: '/api/v1/appointments' },
];

export default function ApiTestPage() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [newAppointment, setNewAppointment] = useState({
    patient_name: 'API測試用戶',
    phone_number: '12345678',
    doctor_name: '測試醫師',
    appointment_time: new Date().toISOString().replace('Z', ''),
    status: '未應診'
  });
  const [postResult, setPostResult] = useState<any>(null);
  const [postError, setPostError] = useState<string>('');
  const [postLoading, setPostLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // 取得環境配置
    axios.get('/api/v1/test')
      .then(response => {
        if (response.data?.config) {
          setConfig(response.data.config);
        }
      })
      .catch(err => console.error('無法取得環境配置', err));
      
    // 測試所有端點
    API_TEST_ENDPOINTS.forEach(endpoint => {
      testEndpoint(endpoint.name, endpoint.url);
    });
  }, []);

  const testEndpoint = async (name: string, url: string) => {
    setLoading(prev => ({ ...prev, [name]: true }));
    setError(prev => ({ ...prev, [name]: '' }));

    try {
      const response = await axios.get(url);
      setResults(prev => ({ ...prev, [name]: response.data }));
    } catch (err: any) {
      console.error(`測試 ${name} 失敗:`, err);
      setError(prev => ({ 
        ...prev, 
        [name]: err.response?.data?.detail || err.message || '未知錯誤'
      }));
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  const testPostEndpoint = async () => {
    setPostLoading(true);
    setPostError('');
    setPostResult(null);

    try {
      const response = await axios.post('/api/v1/appointments', newAppointment, {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Header': 'API測試'
        }
      });
      setPostResult(response.data);
    } catch (err: any) {
      console.error('POST測試失敗:', err);
      if (err.response) {
        // 有回應但是錯誤
        setPostError(`錯誤狀態碼: ${err.response.status}, 訊息: ${JSON.stringify(err.response.data || {})}`);
      } else if (err.request) {
        // 沒有收到回應
        setPostError('未收到伺服器回應，請檢查網絡連接和伺服器狀態');
      } else {
        // 其他錯誤
        setPostError(err.message || '未知錯誤');
      }
    } finally {
      setPostLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6">API 測試診斷頁面</h1>
      
      {/* 環境配置 */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">環境配置</h2>
        {config ? (
          <div className="overflow-x-auto">
            <pre className="bg-gray-50 p-4 rounded text-sm">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-500">載入中...</p>
        )}
      </div>

      {/* GET 測試結果 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">GET 測試結果</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {API_TEST_ENDPOINTS.map((endpoint) => (
            <div key={endpoint.name} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">{endpoint.name}</h3>
                <div className="flex space-x-2">
                  <span className="text-xs text-gray-500">{endpoint.url}</span>
                  <button 
                    onClick={() => testEndpoint(endpoint.name, endpoint.url)}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    disabled={loading[endpoint.name]}
                  >
                    {loading[endpoint.name] ? '測試中...' : '重新測試'}
                  </button>
                </div>
              </div>
              
              {loading[endpoint.name] ? (
                <p className="text-gray-500">測試中...</p>
              ) : error[endpoint.name] ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-4">
                  <p className="text-red-700">錯誤: {error[endpoint.name]}</p>
                </div>
              ) : results[endpoint.name] ? (
                <div className="overflow-x-auto">
                  <pre className="bg-gray-50 p-2 rounded text-xs">
                    {JSON.stringify(results[endpoint.name], null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500">尚未測試</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* POST 測試 */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">POST 測試</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              測試資料:
            </label>
            <div className="overflow-x-auto">
              <pre className="bg-gray-50 p-2 rounded text-xs">
                {JSON.stringify(newAppointment, null, 2)}
              </pre>
            </div>
          </div>
          
          <div className="flex justify-start">
            <button
              onClick={testPostEndpoint}
              disabled={postLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
            >
              {postLoading ? '測試中...' : 'POST 測試 /api/v1/appointments'}
            </button>
          </div>
          
          {postError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-red-700">錯誤: {postError}</p>
            </div>
          )}
          
          {postResult && (
            <div>
              <h3 className="font-medium mb-2">測試結果:</h3>
              <div className="overflow-x-auto">
                <pre className="bg-green-50 p-2 rounded text-xs">
                  {JSON.stringify(postResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Curl 測試指令 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Curl 測試指令</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">測試 GET /api/v1/appointments:</h3>
            <div className="bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
              <code>curl -X GET http://localhost:3000/api/v1/appointments</code>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">測試 POST /api/v1/appointments:</h3>
            <div className="bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
              <code>curl -X POST http://localhost:3000/api/v1/appointments \<br/>
                -H "Content-Type: application/json" \<br/>
                -d '{JSON.stringify(newAppointment)}'
              </code>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">直接測試後端 API:</h3>
            <div className="bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
              <code>curl -X GET http://localhost:8000/api/v1/appointments</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 