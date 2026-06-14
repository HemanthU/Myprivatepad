import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Private Pad",
  description: "Personal cloud textpad",
};

import { ToastProvider } from "@/hooks/useToast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
        <div className="bg-mesh-overlay" />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}