"use client";

import React from "react";

export default function SystemSettingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-100">
            <div className="container mx-auto py-8">
                {children}
            </div>
        </div>
    );
} 