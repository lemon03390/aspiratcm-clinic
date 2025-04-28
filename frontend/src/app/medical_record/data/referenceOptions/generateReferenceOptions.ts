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

// 讀取資料檔案
const readJsonFile = (filename: string): any[] => {
    try {
        const filePath = path.join(dataPath, filename);
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`讀取檔案 ${filename} 時出錯:`, error);
        return [];
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
        console.log(`成功寫入檔案 ${filename}`);
    } catch (error) {
        console.error(`寫入檔案 ${filename} 時出錯:`, error);
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
        console.log('參考資料索引檔案已更新，包含以下選項：', exports);
    } catch (error) {
        console.error('生成索引檔案時出錯:', error);
    }
};

// 處理現代病名資料
const processModernDiseases = () => {
    // 從JSON檔案讀取原始資料
    const rawData = readJsonFile('modern_chinese_disease_name.json') as ModernDisease[];

    // 轉換為 GroupedOption 格式
    const groupedOptions = convertModernDiseasesToGroupedOptions(rawData);

    // 寫入到 TypeScript 檔案
    writeOptionsFile('modernDiseaseOptions.ts', groupedOptions);
};

// 處理中醫證候資料
const processCmSyndromes = () => {
    // 從JSON檔案讀取原始資料
    const rawData = readJsonFile('tcm_codes_fung_version_full.json') as Syndrome[];

    // 轉換為 GroupedOption 格式
    const groupedOptions = convertCmsyndromesToGroupedOptions(rawData);

    // 寫入到 TypeScript 檔案
    writeOptionsFile('cmSyndromeOptions.ts', groupedOptions);
};

// 處理中醫治則資料
const processCmPrinciples = () => {
    // 從JSON檔案讀取原始資料
    const rawData = readJsonFile('tcm_treatment_rule.json') as Principle[];

    // 轉換為 GroupedOption 格式
    const groupedOptions = convertCmPrinciplesToGroupedOptions(rawData);

    // 寫入到 TypeScript 檔案
    writeOptionsFile('cmPrincipleOptions.ts', groupedOptions);
};

// 主函數
const generateReferenceOptions = () => {
    // 確保輸出目錄存在
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    // 生成所有選項資料
    processModernDiseases();
    processCmSyndromes();
    processCmPrinciples();

    // 建立索引檔案 (自動偵測所有選項檔案)
    generateIndexFile();
};

// 執行生成程序
generateReferenceOptions(); 