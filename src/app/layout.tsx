import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ModeProvider } from "@/components/mode/ModeContext";
import { ModeChoiceDialog } from "@/components/mode/ModeChoiceDialog";
import { PaperTradingProvider } from "@/components/paper/PaperTradingContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockSahi — Beginner-Friendly Indian Stock Research",
  description:
    "Research NSE stocks in plain English. Clean, simple, educational — built for beginners who want to understand what they're looking at.",
  keywords: [
    "NSE",
    "Indian stocks",
    "stock research",
    "beginner investing",
    "stock screener",
    "learn stocks",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/*
          ThemeProvider wraps the entire app so next-themes can:
          1. Persist the user's theme choice in localStorage
          2. Detect OS preference via prefers-color-scheme (System mode)
          3. Apply the "dark" class to <html> for CSS variable switching
        */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ModeProvider>
            <PaperTradingProvider>
              {children}
              <ModeChoiceDialog />
              <Toaster />
            </PaperTradingProvider>
          </ModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
