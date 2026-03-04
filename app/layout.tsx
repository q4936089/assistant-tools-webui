import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AssistantTools | 一站式 Web3 代币管理工具",
  description: "专业级代币发行与管理工具 - 一键发币、批量空投、自动归集、代币预售，让 Web3 更简单",
  keywords: ["Web3", "代币", "发币", "ERC20", "BSC", "区块链", "加密货币"],
  authors: [{ name: "AssistantTools" }],
  openGraph: {
    title: "AssistantTools | 专业 Web3 代币管理工具",
    description: "一键发币、批量空投、自动归集、代币预售",
    type: "website",
    locale: "zh_CN",
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f0a1a" },
    { media: "(prefers-color-scheme: light)", color: "#f5f3ff" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
