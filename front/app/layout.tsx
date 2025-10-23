import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { FavoritesFloatingButton } from "@/components/favorites-floating-button";
import { BetaBannerProvider } from "@/components/beta-banner-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Annotrieve - Eukaryotic Genome Annotations",
  description: "Explore annotated genomes from NCBI and Ensembl",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BetaBannerProvider>
          <div className="min-h-screen flex flex-col">
            <AppHeader />
            <main className="flex-1">
              {children}
            </main>
            <FavoritesFloatingButton />
          </div>
        </BetaBannerProvider>
      </body>
    </html>
  );
}
