import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi AI Chat - Free Models Hub",
  description:
    "Chat with free and paid AI models from Groq, OpenRouter, DeepSeek, Kimi, Grok and more. Real-time streaming responses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
