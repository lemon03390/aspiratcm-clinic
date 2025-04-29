process.chdir('/home/ec2-user/AWS-Aspriatcm');

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
        const imports = /** @type {string[]} */ ([]);
        const exports = /** @type {string[]} */ ([]);

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

// 實現基於 parent 分組的轉換函數
const convertModernDiseasesToGroupedOptions = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
    }

    // 分類映射 - 按照 root parent 進行分組
    const categoryMap = new Map();

    // 未分類項目
    const uncategorizedOptions = /** @type {any[]} */ ([]);

    // 建立 code 到項目的映射，方便後續尋找 parent
    const codeToItemMap = new Map();
    data.forEach(item => {
        if (item.code) {
            codeToItemMap.set(item.code, item);
        }
    });

    // 查找項目的最上層 parent (root parent)
    const findRootParent = (item) => {
        if (!item.parent) {
            return item.code;
        }

        let currentParent = item.parent;
        let parentItem = codeToItemMap.get(currentParent);

        // 避免無限循環
        const visitedParents = new Set();

        while (parentItem && parentItem.parent && !visitedParents.has(parentItem.code)) {
            visitedParents.add(parentItem.code);
            currentParent = parentItem.parent;
            parentItem = codeToItemMap.get(currentParent);
        }

        return parentItem ? parentItem.code : '';
    };

    // 第一階段：收集所有主選項
    data.forEach(disease => {
        // 只處理有名稱的項目
        if (!disease.name) {
            return;
        }

        // 創建選項
        const option = {
            label: disease.name,
            value: disease.code,
            notes: disease.notes,
            originalName: disease.name,
            isAlias: false
        };

        // 查找該項的最上層 parent
        let rootParentCode = '';
        if (disease.parent === null) {
            // 這是一個頂層分類
            rootParentCode = disease.code;
        } else {
            rootParentCode = findRootParent(disease);
        }

        // 如果找到了 root parent
        if (rootParentCode) {
            const rootParent = codeToItemMap.get(rootParentCode);
            if (rootParent && rootParent.name) {
                if (!categoryMap.has(rootParentCode)) {
                    categoryMap.set(rootParentCode, []);
                }
                categoryMap.get(rootParentCode).push(option);
                return;
            }
        }

        // 若找不到有效的 parent，放入未分類
        uncategorizedOptions.push(option);
    });

    // 第二階段：處理所有別名
    data.forEach(disease => {
        if (!disease.aliases || disease.aliases.length === 0) {
            return;
        }

        disease.aliases.forEach(alias => {
            if (!alias) {
                return;
            }

            const aliasOption = {
                label: `${alias} (又名: ${disease.name})`,
                value: disease.code,
                notes: disease.notes,
                originalName: disease.name,
                isAlias: true
            };

            // 查找該項的最上層 parent，與主選項邏輯相同
            let rootParentCode = '';
            if (disease.parent === null) {
                rootParentCode = disease.code;
            } else {
                rootParentCode = findRootParent(disease);
            }

            // 如果找到了 root parent
            if (rootParentCode) {
                const rootParent = codeToItemMap.get(rootParentCode);
                if (rootParent && rootParent.name) {
                    if (!categoryMap.has(rootParentCode)) {
                        categoryMap.set(rootParentCode, []);
                    }
                    categoryMap.get(rootParentCode).push(aliasOption);
                    return;
                }
            }

            // 若找不到有效的 parent，放入未分類
            uncategorizedOptions.push(aliasOption);
        });
    });

    // 將 Map 轉換為最終的分組選項格式
    const groupedOptions = /** @type {any[]} */ ([]);

    // 對分類進行排序 (按照 code)
    const sortedCategories = Array.from(categoryMap.keys()).sort();

    // 建立各分類分組
    sortedCategories.forEach(categoryCode => {
        const options = categoryMap.get(categoryCode) || [];
        if (options.length > 0) {
            const rootItem = codeToItemMap.get(categoryCode);
            const categoryName = rootItem ? rootItem.name : '未分類';

            // 對選項進行排序
            const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
            groupedOptions.push({
                label: categoryName,
                options: sortedOptions
            });
        }
    });

    // 處理未分類項目
    if (uncategorizedOptions.length > 0) {
        const sortedUncategorized = uncategorizedOptions.sort((a, b) =>
            a.label.localeCompare(b.label, 'zh-Hant'));

        groupedOptions.push({
            label: '未分類',
            options: sortedUncategorized
        });
    }

    return groupedOptions;
};

const convertCmsyndromesToGroupedOptions = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
    }

    // 分類映射 - 按照 root parent 進行分組
    const categoryMap = new Map();

    // 未分類項目
    const uncategorizedOptions = /** @type {any[]} */ ([]);

    // 建立 code 到項目的映射，方便後續尋找 parent
    const codeToItemMap = new Map();
    data.forEach(item => {
        if (item.code) {
            codeToItemMap.set(item.code, item);
        }
    });

    // 查找項目的最上層 parent (root parent)
    const findRootParent = (item) => {
        if (!item.parent) {
            return item.code;
        }

        let currentParent = item.parent;
        let parentItem = codeToItemMap.get(currentParent);

        // 避免無限循環
        const visitedParents = new Set();

        while (parentItem && parentItem.parent && !visitedParents.has(parentItem.code)) {
            visitedParents.add(parentItem.code);
            currentParent = parentItem.parent;
            parentItem = codeToItemMap.get(currentParent);
        }

        return parentItem ? parentItem.code : '';
    };

    // 第一階段：收集所有主選項
    data.forEach(syndrome => {
        // 只處理有名稱的項目
        if (!syndrome.name) {
            return;
        }

        // 創建選項
        const option = {
            label: syndrome.name,
            value: syndrome.code,
            notes: syndrome.notes,
            originalName: syndrome.name,
            isAlias: false
        };

        // 查找該項的最上層 parent
        let rootParentCode = '';
        if (syndrome.parent === null) {
            // 這是一個頂層分類
            rootParentCode = syndrome.code;
        } else {
            rootParentCode = findRootParent(syndrome);
        }

        // 如果找到了 root parent
        if (rootParentCode) {
            const rootParent = codeToItemMap.get(rootParentCode);
            if (rootParent && rootParent.name) {
                if (!categoryMap.has(rootParentCode)) {
                    categoryMap.set(rootParentCode, []);
                }
                categoryMap.get(rootParentCode).push(option);
                return;
            }
        }

        // 若找不到有效的 parent，放入未分類
        uncategorizedOptions.push(option);
    });

    // 第二階段：處理所有別名
    data.forEach(syndrome => {
        if (!syndrome.aliases || syndrome.aliases.length === 0) {
            return;
        }

        syndrome.aliases.forEach(alias => {
            if (!alias) {
                return;
            }

            const aliasOption = {
                label: `${alias} (又名: ${syndrome.name})`,
                value: syndrome.code,
                notes: syndrome.notes,
                originalName: syndrome.name,
                isAlias: true
            };

            // 查找該項的最上層 parent，與主選項邏輯相同
            let rootParentCode = '';
            if (syndrome.parent === null) {
                rootParentCode = syndrome.code;
            } else {
                rootParentCode = findRootParent(syndrome);
            }

            // 如果找到了 root parent
            if (rootParentCode) {
                const rootParent = codeToItemMap.get(rootParentCode);
                if (rootParent && rootParent.name) {
                    if (!categoryMap.has(rootParentCode)) {
                        categoryMap.set(rootParentCode, []);
                    }
                    categoryMap.get(rootParentCode).push(aliasOption);
                    return;
                }
            }

            // 若找不到有效的 parent，放入未分類
            uncategorizedOptions.push(aliasOption);
        });
    });

    // 將 Map 轉換為最終的分組選項格式
    const groupedOptions = /** @type {any[]} */ ([]);

    // 對分類進行排序 (按照 code)
    const sortedCategories = Array.from(categoryMap.keys()).sort();

    // 建立各分類分組
    sortedCategories.forEach(categoryCode => {
        const options = categoryMap.get(categoryCode) || [];
        if (options.length > 0) {
            const rootItem = codeToItemMap.get(categoryCode);
            const categoryName = rootItem ? rootItem.name : '未分類';

            // 對選項進行排序
            const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
            groupedOptions.push({
                label: categoryName,
                options: sortedOptions
            });
        }
    });

    // 處理未分類項目
    if (uncategorizedOptions.length > 0) {
        const sortedUncategorized = uncategorizedOptions.sort((a, b) =>
            a.label.localeCompare(b.label, 'zh-Hant'));

        groupedOptions.push({
            label: '未分類',
            options: sortedUncategorized
        });
    }

    return groupedOptions;
};

const convertCmPrinciplesToGroupedOptions = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
    }

    // 分類映射 - 按照 root parent 進行分組
    const categoryMap = new Map();

    // 未分類項目
    const uncategorizedOptions = /** @type {any[]} */ ([]);

    // 建立 code 到項目的映射，方便後續尋找 parent
    const codeToItemMap = new Map();
    data.forEach(item => {
        if (item.code) {
            codeToItemMap.set(item.code, item);
        }
    });

    // 查找項目的最上層 parent (root parent)
    const findRootParent = (item) => {
        if (!item.parent) {
            return item.code;
        }

        let currentParent = item.parent;
        let parentItem = codeToItemMap.get(currentParent);

        // 避免無限循環
        const visitedParents = new Set();

        while (parentItem && parentItem.parent && !visitedParents.has(parentItem.code)) {
            visitedParents.add(parentItem.code);
            currentParent = parentItem.parent;
            parentItem = codeToItemMap.get(currentParent);
        }

        return parentItem ? parentItem.code : '';
    };

    // 第一階段：收集所有主選項
    data.forEach(principle => {
        // 只處理有名稱的項目
        if (!principle.name) {
            return;
        }

        // 創建選項
        const option = {
            label: principle.name,
            value: principle.code,
            notes: principle.notes,
            originalName: principle.name,
            isAlias: false
        };

        // 查找該項的最上層 parent
        let rootParentCode = '';
        if (principle.parent === null) {
            // 這是一個頂層分類
            rootParentCode = principle.code;
        } else {
            rootParentCode = findRootParent(principle);
        }

        // 如果找到了 root parent
        if (rootParentCode) {
            const rootParent = codeToItemMap.get(rootParentCode);
            if (rootParent && rootParent.name) {
                if (!categoryMap.has(rootParentCode)) {
                    categoryMap.set(rootParentCode, []);
                }
                categoryMap.get(rootParentCode).push(option);
                return;
            }
        }

        // 若找不到有效的 parent，放入未分類
        uncategorizedOptions.push(option);
    });

    // 第二階段：處理所有別名
    data.forEach(principle => {
        if (!principle.aliases || principle.aliases.length === 0) {
            return;
        }

        principle.aliases.forEach(alias => {
            if (!alias) {
                return;
            }

            const aliasOption = {
                label: `${alias} (又名: ${principle.name})`,
                value: principle.code,
                notes: principle.notes,
                originalName: principle.name,
                isAlias: true
            };

            // 查找該項的最上層 parent，與主選項邏輯相同
            let rootParentCode = '';
            if (principle.parent === null) {
                rootParentCode = principle.code;
            } else {
                rootParentCode = findRootParent(principle);
            }

            // 如果找到了 root parent
            if (rootParentCode) {
                const rootParent = codeToItemMap.get(rootParentCode);
                if (rootParent && rootParent.name) {
                    if (!categoryMap.has(rootParentCode)) {
                        categoryMap.set(rootParentCode, []);
                    }
                    categoryMap.get(rootParentCode).push(aliasOption);
                    return;
                }
            }

            // 若找不到有效的 parent，放入未分類
            uncategorizedOptions.push(aliasOption);
        });
    });

    // 將 Map 轉換為最終的分組選項格式
    const groupedOptions = /** @type {any[]} */ ([]);

    // 對分類進行排序 (按照 code)
    const sortedCategories = Array.from(categoryMap.keys()).sort();

    // 建立各分類分組
    sortedCategories.forEach(categoryCode => {
        const options = categoryMap.get(categoryCode) || [];
        if (options.length > 0) {
            const rootItem = codeToItemMap.get(categoryCode);
            const categoryName = rootItem ? rootItem.name : '未分類';

            // 對選項進行排序
            const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
            groupedOptions.push({
                label: categoryName,
                options: sortedOptions
            });
        }
    });

    // 處理未分類項目
    if (uncategorizedOptions.length > 0) {
        const sortedUncategorized = uncategorizedOptions.sort((a, b) =>
            a.label.localeCompare(b.label, 'zh-Hant'));

        groupedOptions.push({
            label: '未分類',
            options: sortedUncategorized
        });
    }

    return groupedOptions;
};

// 轉換並處理參考數據
const processReferenceData = () => {
    // 載入數據
    const modernDiseases = readJsonFile('./frontend/public/data/modern_chinese_disease_name.json');
    const cmSyndromes = readJsonFile('./frontend/public/data/tcm_codes_fung_version_full.json');
    const cmPrinciples = readJsonFile('./frontend/public/data/tcm_treatment_rule.json');

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
