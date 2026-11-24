import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { intro, SITE_URL } from "@/data/content";
import Footer from "@/components/site/Footer";
import TopBar from "@/components/site/TopBar";
import { themeScript } from "@/components/site/theme";

const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

const title = "Ayad Arif | Product Manager";
const description = intro.roleLine;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL), // makes og:image URLs absolute, which LinkedIn needs
  title: { default: title, template: "%s | Ayad Arif" },
  description,
  openGraph: { title, description, siteName: "Ayad Arif", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline script adds the "dark" class before React loads.
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <TopBar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
