import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { fontVariables } from "./fonts";
import "./globals.css";
import { LocaleProvider } from "@/i18n/provider";
import { ThemeProvider } from "@/hooks/useTheme";
import { GrainOverlay } from "@/components/layout/GrainOverlay";

export const viewport: Viewport = {
  themeColor: "#FFFDF9",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Chithi — চিঠি",
  description: "Send your letter to loved ones.",
  metadataBase: new URL("http://localhost:3000"),
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Chithi — চিঠি",
    description: "Send your letter to loved ones.",
    type: "website",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('chithi:theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-[#FFFDF9] dark:bg-[#0C0314] text-[#382A22] dark:text-[#F5EBE6] antialiased min-h-screen relative selection:bg-[#FFE5B4] selection:text-[#382A22] transition-colors duration-200">
        <ThemeProvider>
          <LocaleProvider>
            <GrainOverlay />
            {children}
          </LocaleProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
