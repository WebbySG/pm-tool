import type { Metadata } from "next";
import "./globals.css";
import { StoreInitializer } from "@/components/store-initializer";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { getThemeVarsScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Webby SG OS",
  description: "Internal project management for Webby SG",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{${getThemeVarsScript()}}catch(e){}` }} />
      </head>
      <body>
        <ThemeProvider />
        <AuthProvider>
          <StoreInitializer />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
