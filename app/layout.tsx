import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

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
    <html lang="en" className="h-full overflow-hidden">
      <body className="h-full overflow-hidden antialiased">
        <AuthProvider>
          <div className="h-full w-full overflow-hidden">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
