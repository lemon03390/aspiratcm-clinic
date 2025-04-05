export interface ConsultationType {
  id: string;
  label: string;
  subTypes?: Array<{ id: string; label: string }>;
  subTypeLabel?: string;
}

export const consultationTypes: ConsultationType[] = [
  {
    id: 'regular',
    label: '一般診症',
    subTypes: [
      { id: 'first_visit', label: '首次診症' },
      { id: 'follow_up', label: '覆診' }
    ],
    subTypeLabel: '診症類型'
  },
  {
    id: 'chronic',
    label: '慢性疾病',
    subTypes: [
      { id: 'hypertension', label: '高血壓' },
      { id: 'diabetes', label: '糖尿病' },
      { id: 'arthritis', label: '關節炎' },
      { id: 'others', label: '其他' }
    ],
    subTypeLabel: '疾病類型'
  },
  {
    id: 'acupuncture',
    label: '針灸治療',
    subTypes: [
      { id: 'pain', label: '疼痛管理' },
      { id: 'stress', label: '壓力緩解' },
      { id: 'others', label: '其他' }
    ],
    subTypeLabel: '治療目的'
  },
  {
    id: 'massage',
    label: '推拿按摩',
    subTypes: [
      { id: 'back', label: '背部按摩' },
      { id: 'shoulder', label: '肩頸按摩' },
      { id: 'full_body', label: '全身按摩' }
    ],
    subTypeLabel: '按摩部位'
  },
  {
    id: 'herbal',
    label: '中藥治療',
    subTypeLabel: '症狀'
  }
]; 