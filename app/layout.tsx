import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Private Pad",
  description: "Personal cloud textpad",
};

import { ToastProvider } from "@/hooks/useToast";
import GlobalShortcuts from "@/components/GlobalShortcuts";

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body>
        <GlobalShortcuts />
        <div className="bg-mesh-overlay" />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}