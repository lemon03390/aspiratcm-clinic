"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 自動跳轉到儀表板頁面
    router.push("/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">中醫診所管理系統</h1>
      <p className="text-xl mb-8">正在跳轉至系統儀表板...</p>
      <button
        onClick={() => router.push("/dashboard")}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300"
      >
        立即前往
      </button>
    </main>
  );
}
