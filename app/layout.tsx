import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import Script from "next/script";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Banking Framework Compliance Dashboard",
  description: "Climate physical risk analytics dashboard for branch portfolio management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <Script id="theme-boot" strategy="beforeInteractive">
          {`try{const s=localStorage.getItem("theme");if(s==="dark"){document.documentElement.classList.add("dark")}else if(s==="light"){document.documentElement.classList.remove("dark")}}catch(e){}`}
        </Script>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
