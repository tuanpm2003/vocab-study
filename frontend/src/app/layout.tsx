import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";

const geistSans = Geist({
  // Tên biến phải là --font-sans: globals.css của shadcn đọc đúng tên này.
  variable: "--font-sans",
  // Thiếu "vietnamese", trình duyệt vẽ các chữ như ặ, ế, ộ bằng font dự phòng
  // và một từ tiếng Việt sẽ lẫn hai font khác nhau.
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vocabulary",
  description: "Quản lý và ghi nhớ từ vựng nhiều ngôn ngữ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        <Toaster theme="light" position="top-center" richColors />
      </body>
    </html>
  );
}
