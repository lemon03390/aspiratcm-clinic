import fs from 'fs';
import path from 'path';
import { GroupedOption, ModernDisease, Principle, Syndrome } from '../../types/diagnosisReferenceTypes';
import {
    convertCmPrinciplesToGroupedOptions,
    convertCmsyndromesToGroupedOptions,
    convertModernDiseasesToGroupedOptions
} from '../../utils/diagnosisReferenceUtils';

// 檔案路徑
const dataPath = path.join(process.cwd(), 'public/data');
const outputPath = path.join(process.cwd(), 'src/app/medical_record/data/referenceOptions');

/**
 * 自訂錯誤日誌格式
 * @param message 錯誤訊息
 * @param error 錯誤物件
 */
const logError = (message: string, error: any) => {
    console.error(`⛔ ${message}:`);
    console.error(error);
};

/**
 * 自訂成功日誌格式
 * @param message 成功訊息
 * @param details 詳細資訊
 */
const logSuccess = (message: string, details?: any) => {
    console.log(`✅ ${message}`);
    if (details) {
        console.log(details);
    }
};

/**
 * 自訂通知日誌格式
 * @param message 通知訊息
 */
const logInfo = (message: string) => {
    console.log(`ℹ️ ${message}`);
};

// 讀取資料檔案
const readJsonFile = (filename: string): any[] => {
    try {
        const filePath = path.join(dataPath, filename);
        if (!fs.existsSync(filePath)) {
            logError(`找不到檔案 ${filename}`, `路徑: ${filePath}`);
            return [];
        }

        const data = fs.readFileSync(filePath, 'utf8');
        const parsedData = JSON.parse(data);

        if (!Array.isArray(parsedData)) {
            logError(`檔案 ${filename} 格式不正確, 應為陣列`, parsedData);
            return [];
        }

        logSuccess(`成功讀取 ${filename}`);
        return parsedData;
    } catch (error) {
        logError(`讀取檔案 ${filename} 時出錯`, error);
        return [];
    }
};

// 驗證資料中的 parent 欄位是否有效
const validateParents = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        return;
    }

    // 建立所有有效 code 的集合
    const validCodes = new Set<string>();
    data.forEach(item => {
        if (item.code) {
            validCodes.add(item.code);
        }
    });

    // 檢查每個項目的 parent 是否存在
    const invalidItems: { code: string, parent: string }[] = [];
    data.forEach(item => {
        if (item.parent && !validCodes.has(item.parent) && item.parent !== null) {
            invalidItems.push({ code: item.code, parent: item.parent });
        }
    });

    if (invalidItems.length > 0) {
        logError(`${filename} 中有 ${invalidItems.length} 項目的 parent 無效`, invalidItems);
    } else {
        logSuccess(`${filename} 中所有項目的 parent 欄位有效`);
    }
};

// 寫入處理後的資料
const writeOptionsFile = (filename: string, data: GroupedOption[]) => {
    try {
        const filePath = path.join(outputPath, filename);
        const content = `// 自動生成的診斷選項資料, 請勿手動修改
import { GroupedOption } from '../../types/diagnosisReferenceTypes';

export const options: GroupedOption[] = ${JSON.stringify(data, null, 2)};

export default options;`;

        fs.writeFileSync(filePath, content);

        const categoriesCount = data.length;
        const totalOptions = data.reduce((sum, group) => sum + group.options.length, 0);
        logSuccess(`成功寫入檔案 ${filename}`, `共 ${categoriesCount} 個分類, ${totalOptions} 個選項`);
    } catch (error) {
        logError(`寫入檔案 ${filename} 時出錯`, error);
    }
};

// 自動尋找所有參考選項檔案並建立索引
const generateIndexFile = () => {
    try {
        // 讀取目錄中所有的檔案
        const files = fs.readdirSync(outputPath);

        // 過濾出所有格式為 xxxOptions.ts 的檔案，但排除 index.ts
        const optionsFiles = files.filter(file =>
            file.endsWith('Options.ts') &&
            file !== 'index.ts' &&
            !file.startsWith('generate')
        );

        // 準備匯入與匯出內容
        const imports: string[] = [];
        const exports: string[] = [];

        // 為每個選項檔案建立匯入和匯出語句
        optionsFiles.forEach(file => {
            // 從檔名取得 optionName (去掉 .ts 副檔名)
            const optionName = file.replace('.ts', '');

            // 添加匯入語句
            imports.push(`import { options as ${optionName} } from './${optionName}';`);

            // 添加至匯出列表
            exports.push(optionName);
        });

        // 建立索引檔案內容
        const indexContent = `// 自動生成的診斷參考資料索引檔
${imports.join('\n')}

export {
  ${exports.join(',\n  ')}
};
`;

        // 寫入索引檔案
        fs.writeFileSync(path.join(outputPath, 'index.ts'), indexContent);
        logSuccess('參考資料索引檔案已更新', exports);
    } catch (error) {
        logError('生成索引檔案時出錯', error);
    }
};

// 處理現代病名資料
const processModernDiseases = () => {
    logInfo('開始處理現代病名資料...');

    // 從JSON檔案讀取原始資料
    const rawData = readJsonFile('modern_chinese_disease_name.json') as ModernDisease[];

    if (rawData.length === 0) {
        logError('現代病名資料為空，無法處理', null);
        return;
    }

    // 驗證資料
    validateParents(rawData, '現代病名');

    // 轉換為 GroupedOption 格式
    logInfo('正在轉換現代病名為分組選項...');
    const groupedOptions = convertModernDiseasesToGroupedOptions(rawData);

    // 寫入到 TypeScript 檔案
    writeOptionsFile('modernDiseaseOptions.ts', groupedOptions);
};

// 處理中醫證候資料
const processCmSyndromes = () => {
    logInfo('開始處理中醫證候資料...');

    // 從JSON檔案讀取原始資料
    const rawData = readJsonFile('tcm_codes_fung_version_full.json') as Syndrome[];

    if (rawData.length === 0) {
        logError('中醫證候資料為空，無法處理', null);
        return;
    }

    // 驗證資料
    validateParents(rawData, '中醫證候');

    // 轉換為 GroupedOption 格式
    logInfo('正在轉換中醫證候為分組選項...');
    const groupedOptions = convertCmsyndromesToGroupedOptions(rawData);

    // 寫入到 TypeScript 檔案
    writeOptionsFile('cmSyndromeOptions.ts', groupedOptions);
};

// 處理中醫治則資料
const processCmPrinciples = () => {
    logInfo('開始處理中醫治則資料...');

    // 從JSON檔案讀取原始資料
    const rawData = readJsonFile('tcm_treatment_rule.json') as Principle[];

    if (rawData.length === 0) {
        logError('中醫治則資料為空，無法處理', null);
        return;
    }

    // 驗證資料
    validateParents(rawData, '中醫治則');

    // 轉換為 GroupedOption 格式
    logInfo('正在轉換中醫治則為分組選項...');
    const groupedOptions = convertCmPrinciplesToGroupedOptions(rawData);

    // 寫入到 TypeScript 檔案
    writeOptionsFile('cmPrincipleOptions.ts', groupedOptions);
};

// 主函數
const generateReferenceOptions = () => {
    // 確保輸出目錄存在
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
        logInfo(`已建立輸出目錄: ${outputPath}`);
    }

    logInfo('=== 開始生成參考選項資料 ===');

    // 生成所有選項資料
    processModernDiseases();
    processCmSyndromes();
    processCmPrinciples();

    // 建立索引檔案 (自動偵測所有選項檔案)
    generateIndexFile();

    logInfo('=== 參考選項資料生成完成 ===');
};

// 執行生成程序
generateReferenceOptions(); 