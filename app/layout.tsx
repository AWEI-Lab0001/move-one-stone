import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "石头记 · 今日", description: "先把每天最重要的大石头放进去。", manifest: "/manifest.webmanifest", icons: { icon: "/favicon.svg", apple: "/icon-192.svg" }, appleWebApp: { capable: true, statusBarStyle: "default", title: "石头记" }, formatDetection: { telephone: false } };
export const viewport: Viewport = { themeColor: "#17324d", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
