'use client';

import React from 'react';

// 默認路徑，當路徑為空或無效時使用
const DEFAULT_PATH = "M0 0";

// 確保 SVG 路徑有效
const ensurePath = (path: string | undefined): string => {
    if (!path || path.trim() === '') {
        console.warn('發現無效的 SVG path，使用預設值');
        return DEFAULT_PATH;
    }
    return path;
};

// 基本 Icon 組件
interface IconProps {
    path?: string;
    size?: number;
    className?: string;
    color?: string;
    strokeWidth?: number;
    fill?: string;
    stroke?: string;
    viewBox?: string;
}

export const Icon: React.FC<IconProps> = ({
    path,
    size = 24,
    className = '',
    color = 'currentColor',
    strokeWidth = 1.5,
    fill = 'none',
    stroke = 'currentColor',
    viewBox = '0 0 24 24'
}) => {
    const validPath = ensurePath(path);

    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox={viewBox}
            fill={fill}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d={validPath}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={fill}
            />
        </svg>
    );
};

// 常用圖標定義
export const ICON_PATHS = {
    CLOSE: "M6 18L18 6M6 6l12 12",
    INFO: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    WARNING: "M12 9v2m0 4h.01M12 19A7 7 0 1 0 12 5a7 7 0 0 0 0 14Z",
    SUCCESS: "M5 13l4 4L19 7",
    LOADING: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z",
    SEARCH: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    CALENDAR: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    EDIT: "M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z",
    USER: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    PLUS: "M12 6v6m0 0v6m0-6h6m-6 0H6",
    CHEVRON_LEFT: "M15 19l-7-7 7-7",
    CHEVRON_RIGHT: "M9 5l7 7-7 7",
    CHECK: "M5 13l4 4L19 7",
    WHATSAPP: "M17.415 14.382c-.298-.149-1.759-.89-2.032-1.002-.272-.106-.47-.17-.67.166-.198.334-.813 1.042-.994 1.254-.182.213-.364.242-.67.08-.303-.161-1.28-.483-2.442-1.543-.903-.818-1.507-1.83-1.685-2.147-.177-.317-.018-.49.135-.647.137-.143.304-.372.456-.558.152-.186.203-.318.305-.477.101-.158.051-.297-.026-.416-.077-.12-.705-1.696-.966-2.323-.255-.616-.514-.532-.705-.542-.183-.01-.392-.011-.602-.011-.21 0-.548.078-.835.385-.287.307-1.094 1.068-1.094 2.604 0 1.536 1.12 3.02 1.273 3.227.153.208 2.15 3.284 5.214 4.61.73.316 1.3.505 1.743.645.735.236 1.403.202 1.93.123.587-.085 1.806-.736 2.063-1.445.255-.71.255-1.316.179-1.444-.076-.126-.28-.2-.586-.349"
};

// 預定義圖標組件
export const CloseIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.CLOSE} {...props} />;

export const InfoIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.INFO} {...props} />;

export const WarningIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.WARNING} {...props} />;

export const SuccessIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.SUCCESS} {...props} />;

export const LoadingIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.LOADING} fill="currentColor" {...props} />;

export const SearchIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.SEARCH} {...props} />;

export const CalendarIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.CALENDAR} {...props} />;

export const EditIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.EDIT} fill="currentColor" stroke="none" {...props} />;

export const UserIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.USER} fill="currentColor" stroke="none" {...props} />;

export const PlusIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.PLUS} {...props} />;

export const ChevronLeftIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.CHEVRON_LEFT} {...props} />;

export const ChevronRightIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.CHEVRON_RIGHT} {...props} />;

export const CheckIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.CHECK} {...props} />;

export const WhatsAppIcon: React.FC<Omit<IconProps, 'path'>> = (props) =>
    <Icon path={ICON_PATHS.WHATSAPP} fill="currentColor" stroke="none" {...props} />; 