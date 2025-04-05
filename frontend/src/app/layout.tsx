import "./globals.css";

export const metadata = {
  title: "預約管理系統",
  description: "診所預約管理系統",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body
        suppressHydrationWarning
        className="bg-gray-100 min-h-screen antialiased text-slate-800 font-sans"
      >
        {children}
      </body>
    </html>
  );
}
