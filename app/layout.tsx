import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Move One Stone · 石头记", description: "一天总会被填满，先放进真正重要的那一块。", manifest: "/manifest.webmanifest", icons: { icon: "/favicon.svg", apple: "/icon-192.svg" }, appleWebApp: { capable: true, statusBarStyle: "default", title: "石头记" }, formatDetection: { telephone: false } };
export const viewport: Viewport = { themeColor: "#17324d", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
