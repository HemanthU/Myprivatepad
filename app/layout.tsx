import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PadX Premium",
  description: "Personal cloud code editor and notes",
};

import { ToastProvider } from "@/hooks/useToast";
import GlobalShortcuts from "@/components/GlobalShortcuts";
import ThemeProvider from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const settings = JSON.parse(localStorage.getItem('padx-settings') || '{}');
                const theme = settings?.state?.theme || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
                if (['dark', 'amoled', 'dracula', 'cyberpunk'].includes(theme)) {
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
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}