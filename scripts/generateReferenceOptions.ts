const fs = require('fs');
const path = require('path');

// 讀取JSON檔案
const readJsonFile = (filePath) => {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`讀取檔案 ${filePath} 失敗:`, error);
        return [];
    }
};

// 寫入JSON檔案
const writeJsonFile = (filePath, data) => {
    try {
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`成功寫入檔案: ${filePath}`);
    } catch (error) {
        console.error(`寫入檔案 ${filePath} 失敗:`, error);
    }
};

// 寫入選項資料為 TypeScript 檔案
const writeOptionsFile = (filePath, data) => {
    try {
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        const content = `// 自動生成的診斷選項資料, 請勿手動修改
import { GroupedOption } from '../../types/diagnosisReferenceTypes';

export const options: GroupedOption[] = ${JSON.stringify(data, null, 2)};

export default options;`;
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`成功寫入檔案: ${filePath}`);
    } catch (error) {
        console.error(`寫入檔案 ${filePath} 失敗:`, error);
    }
};

// 自動尋找所有參考選項檔案並建立索引
const generateIndexFile = (directory) => {
    try {
        // 讀取目錄中所有的檔案
        const files = fs.readdirSync(directory);

        // 過濾出所有格式為 xxxOptions.ts 的檔案，但排除 index.ts
        const optionsFiles = files.filter(file =>
            file.endsWith('Options.ts') &&
            file !== 'index.ts' &&
            !file.startsWith('generate')
        );

        // 準備匯入與匯出內容
        const imports = [] as string[];
        const exports = [] as string[];

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
        fs.writeFileSync(path.join(directory, 'index.ts'), indexContent);
        console.log('參考資料索引檔案已更新，包含以下選項：', exports);
    } catch (error) {
        console.error('生成索引檔案時出錯:', error);
    }
};

// 需要從 frontend 引入的轉換函式，在腳本中實現簡化版
// 這是簡化版的轉換函數，實際會使用 frontend 中的完整實現
const convertModernDiseasesToGroupedOptions = (diseases) => {
    // 按照首字母分組
    const grouped = {};
    diseases.forEach(disease => {
        const firstChar = disease.name.charAt(0).toUpperCase();
        if (!grouped[firstChar]) {
            grouped[firstChar] = [];
        }

        // 加入主條目
        grouped[firstChar].push({
            label: disease.name,
            value: disease.code || disease.name,
            notes: disease.notes || "",
            originalName: disease.name,
            isAlias: false
        });

        // 加入別名條目
        if (disease.aliases && disease.aliases.length > 0) {
            disease.aliases.forEach(alias => {
                grouped[firstChar].push({
                    label: `${alias} (又名: ${disease.name})`,
                    value: disease.code || disease.name,
                    notes: disease.notes || "",
                    originalName: disease.name,
                    isAlias: true
                });
            });
        }
    });

    // 轉換為陣列格式
    return Object.keys(grouped).sort().map(key => ({
        label: key,
        options: grouped[key]
    }));
};

const convertCmsyndromesToGroupedOptions = (syndromes) => {
    // 實作類似 convertModernDiseasesToGroupedOptions 的分組邏輯
    const grouped = {};
    syndromes.forEach(syndrome => {
        const firstChar = syndrome.name.charAt(0).toUpperCase();
        if (!grouped[firstChar]) {
            grouped[firstChar] = [];
        }

        grouped[firstChar].push({
            label: syndrome.name,
            value: syndrome.code || syndrome.name,
            notes: syndrome.notes || "",
            originalName: syndrome.name,
            isAlias: false
        });

        if (syndrome.aliases && syndrome.aliases.length > 0) {
            syndrome.aliases.forEach(alias => {
                grouped[firstChar].push({
                    label: `${alias} (又名: ${syndrome.name})`,
                    value: syndrome.code || syndrome.name,
                    notes: syndrome.notes || "",
                    originalName: syndrome.name,
                    isAlias: true
                });
            });
        }
    });

    return Object.keys(grouped).sort().map(key => ({
        label: key,
        options: grouped[key]
    }));
};

const convertCmPrinciplesToGroupedOptions = (principles) => {
    // 實作類似 convertModernDiseasesToGroupedOptions 的分組邏輯
    const grouped = {};
    principles.forEach(principle => {
        const firstChar = principle.name.charAt(0).toUpperCase();
        if (!grouped[firstChar]) {
            grouped[firstChar] = [];
        }

        grouped[firstChar].push({
            label: principle.name,
            value: principle.code || principle.name,
            notes: principle.notes || "",
            originalName: principle.name,
            isAlias: false
        });

        if (principle.aliases && principle.aliases.length > 0) {
            principle.aliases.forEach(alias => {
                grouped[firstChar].push({
                    label: `${alias} (又名: ${principle.name})`,
                    value: principle.code || principle.name,
                    notes: principle.notes || "",
                    originalName: principle.name,
                    isAlias: true
                });
            });
        }
    });

    return Object.keys(grouped).sort().map(key => ({
        label: key,
        options: grouped[key]
    }));
};

// 轉換並處理參考數據
const processReferenceData = () => {
    // 載入數據
    const modernDiseases = readJsonFile('./backend/data/modern_chinese_disease_name.json');
    const cmSyndromes = readJsonFile('./backend/data/tcm_codes_fung_version_full.json');
    const cmPrinciples = readJsonFile('./backend/data/tcm_treatment_rule.json');

    // 轉換為分組選項格式
    const modernDiseaseOptions = convertModernDiseasesToGroupedOptions(modernDiseases);
    const cmSyndromeOptions = convertCmsyndromesToGroupedOptions(cmSyndromes);
    const cmPrincipleOptions = convertCmPrinciplesToGroupedOptions(cmPrinciples);

    // 設定輸出路徑
    const referenceDir = './frontend/src/app/medical_record/data/reference';
    const optionsDir = './frontend/src/app/medical_record/data/referenceOptions';

    // 確保目錄存在
    if (!fs.existsSync(referenceDir)) {
        fs.mkdirSync(referenceDir, { recursive: true });
    }
    if (!fs.existsSync(optionsDir)) {
        fs.mkdirSync(optionsDir, { recursive: true });
    }

    // 寫入JSON檔案
    writeJsonFile(`${referenceDir}/modern_disease_options.json`, modernDiseaseOptions);
    writeJsonFile(`${referenceDir}/cm_syndrome_options.json`, cmSyndromeOptions);
    writeJsonFile(`${referenceDir}/cm_principle_options.json`, cmPrincipleOptions);

    // 寫入TypeScript檔案
    writeOptionsFile(`${optionsDir}/modernDiseaseOptions.ts`, modernDiseaseOptions);
    writeOptionsFile(`${optionsDir}/cmSyndromeOptions.ts`, cmSyndromeOptions);
    writeOptionsFile(`${optionsDir}/cmPrincipleOptions.ts`, cmPrincipleOptions);

    // 生成index.ts檔案
    generateIndexFile(optionsDir);

    // 統計資訊
    console.log(`現代疾病：共 ${modernDiseases.length} 項`);
    console.log(`中醫辨證：共 ${cmSyndromes.length} 項`);
    console.log(`中醫治則：共 ${cmPrinciples.length} 項`);

    // 計算含有別名的項目數量
    const countItemsWithAliases = (items) => {
        return items.filter(item => item.aliases && item.aliases.length > 0).length;
    };

    console.log(`現代疾病中含有別名的項目：${countItemsWithAliases(modernDiseases)} 項`);
    console.log(`中醫辨證中含有別名的項目：${countItemsWithAliases(cmSyndromes)} 項`);
    console.log(`中醫治則中含有別名的項目：${countItemsWithAliases(cmPrinciples)} 項`);
};

// 執行處理
processReferenceData();
