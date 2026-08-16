import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Laguna Leaf Wellness Center — Admin Portal",
  description: "Internal business management system for Laguna Leaf Wellness Center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-[#E3E7E4] text-[#1C2A21] dark:bg-[#111816] dark:text-[#E8F0EC]">
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--toast-bg, #FFFFFF)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
