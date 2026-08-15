import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

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
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-[#FAFAF8] text-[#2D3B35]">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              border: "1px solid #E8EDE9",
              color: "#2D3B35",
            },
          }}
        />
      </body>
    </html>
  );
}
