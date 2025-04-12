import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata = {
  title: "中醫診所管理系統",
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
        <Navbar />
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
