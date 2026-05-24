import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VedaAI — AI Assessment Creator",
  description: "Create AI-powered assignments and question papers for students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface-primary text-brand-dark font-body">
        {children}
      </body>
    </html>
  );
}