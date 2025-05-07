export interface ConsultationType {
    id: string;
    label: string;
    subTypes?: { id: string; label: string }[];
}

export const consultationTypes: ConsultationType[] = [
    {
        id: 'internal',
        label: '內科',
        subTypes: [
            { id: 'cold', label: '感冒' },
            { id: 'cough', label: '咳嗽' },
            { id: 'insomnia', label: '失眠' },
            { id: 'digestive', label: '腸胃不適' },
            { id: 'dizziness', label: '頭暈' },
            { id: 'headache', label: '頭痛' },
            { id: 'edema', label: '水腫' },
            { id: 'numbness', label: '麻痺' },
            { id: 'other_internal', label: '其他' },
        ],
    },
    {
        id: 'dermatology',
        label: '皮膚問題',
        subTypes: [
            { id: 'eczema', label: '濕疹' },
            { id: 'acne', label: '暗瘡' },
            { id: 'itching', label: '皮膚痕癢' },
            { id: 'urticaria', label: '蕁麻疹' },
            { id: 'other_dermatology', label: '其他' },
        ],
    },
    {
        id: 'gynecology',
        label: '婦科',
        subTypes: [
            { id: 'menstrual', label: '月經不調' },
            { id: 'dysmenorrhea', label: '痛經' },
            { id: 'discharge', label: '分泌物異常' },
            { id: 'infertility', label: '不孕' },
            { id: 'other_gynecology', label: '其他' },
        ],
    },
    {
        id: 'pediatrics',
        label: '兒科',
        subTypes: [
            { id: 'child_cold', label: '小兒感冒' },
            { id: 'child_cough', label: '小兒咳嗽' },
            { id: 'child_indigestion', label: '小兒積滯' },
            { id: 'child_crying', label: '小兒夜啼' },
            { id: 'child_anorexia', label: '小兒厭食' },
            { id: 'other_pediatrics', label: '其他' },
        ],
    },
    {
        id: 'pain',
        label: '痛症',
        subTypes: [
            { id: 'neck_shoulder', label: '肩頸疼痛' },
            { id: 'hand', label: '手部疼痛' },
            { id: 'knee', label: '膝關節痛' },
            { id: 'ankle', label: '踝關節痛' },
            { id: 'back', label: '腰痛' },
            { id: 'other_pain', label: '其他' },
        ],
    },
    {
        id: 'bone_setting',
        label: '正骨',
        subTypes: [
            { id: 'head', label: '頭部' },
            { id: 'hand_bone', label: '手部' },
            { id: 'foot', label: '足部' },
            { id: 'trunk', label: '軀幹部' },
            { id: 'other_bone', label: '其他' },
        ],
    },
    {
        id: 'acupuncture',
        label: '針灸',
        subTypes: [
            { id: 'acupuncture_internal', label: '內科' },
            { id: 'acupuncture_pain', label: '痛症' },
            { id: 'other_acupuncture', label: '其他' },
        ],
    },
    {
        id: 'unknown',
        label: '不清楚',
        subTypes: [
            { id: 'not_mentioned', label: '未有提及' },
        ],
    },
]; 