#!/usr/bin/env node
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 測試配置
const config = {
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://clinic-dev:8000',
  endpoints: [
    { name: '前端測試API', path: '/api/v1/test' },
    { name: '前端測試API (Backend連線)', path: '/api/v1/test?endpoint=backend' },
    { name: '後端健康檢查', path: 'http://clinic-dev:8000/api/v1/health' },
    { name: '預約API (GET)', path: '/api/v1/appointments' },
    { name: '預約API (POST)', path: '/api/v1/appointments', method: 'POST', data: {
      patient_name: 'API測試',
      phone_number: '12345678',
      doctor_name: '測試醫師',
      appointment_time: new Date().toISOString(),
      status: '未應診'
    }},
  ]
};

async function runTests() {
  console.log('===== API 測試診斷工具 =====');
  console.log('時間:', new Date().toLocaleString());
  console.log('前端URL:', config.frontendUrl);
  console.log('後端URL:', config.backendUrl);
  console.log('===========================\n');

  for (const endpoint of config.endpoints) {
    const method = endpoint.method || 'GET';
    const url = endpoint.path.startsWith('http') 
      ? endpoint.path 
      : `${config.frontendUrl}${endpoint.path}`;
    
    console.log(`測試 [${method}] ${endpoint.name}: ${url}`);
    
    try {
      const response = await axios({
        method,
        url,
        data: endpoint.data,
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`✅ 成功 (${response.status})`);
      console.log('回應數據:', JSON.stringify(response.data, null, 2).slice(0, 200) + '...');
    } catch (error) {
      console.log('❌ 失敗');
      
      if (error.response) {
        console.log(`狀態碼: ${error.response.status}`);
        console.log('回應數據:', error.response.data);
      } else if (error.request) {
        console.log('未收到回應，可能是連接問題');
      } else {
        console.log('錯誤:', error.message);
      }
    }
    
    console.log('----------------------------\n');
  }
}

// 保存環境信息
function saveEnvironmentInfo() {
  const envInfo = {
    nodejs: process.version,
    platform: process.platform,
    architecture: process.arch,
    env: {
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '未設置',
      NODE_ENV: process.env.NODE_ENV,
    },
    packageJson: {}
  };
  
  // 讀取 package.json
  try {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      envInfo.packageJson = {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: packageJson.dependencies,
      };
    }
  } catch (error) {
    console.error('讀取 package.json 失敗:', error);
  }
  
  // 保存到文件
  const outputPath = path.resolve(process.cwd(), 'api-test-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(envInfo, null, 2));
  console.log(`環境信息已保存到: ${outputPath}`);
}

// 執行測試
runTests()
  .then(() => {
    console.log('API測試完成');
    saveEnvironmentInfo();
  })
  .catch(error => {
    console.error('測試過程中發生錯誤:', error);
  }); 