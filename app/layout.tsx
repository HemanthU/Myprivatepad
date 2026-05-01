import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Private Pad",
  description: "Personal cloud textpad",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}