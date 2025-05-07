import React from 'react';

export const metadata = {
    title: '會員管理 - 醫療診所管理系統',
    description: '會員資料管理頁面',
};

export default function MemberLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <section>
            {children}
        </section>
    );
} 