import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RinaWarp Terminal — The World's First Terminal with FREE Ultra-Fast AI",
  description: "Get instant coding help with GPT-5, Claude 4.1 & Gemini 2.5. Start free with 150 AI requests/month, upgrade from $12/mo. The perfect AI terminal for modern developers.",
  keywords: "terminal, AI, development, coding, Groq, ChatGPT alternative, developer tools"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
