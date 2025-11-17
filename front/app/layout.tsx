import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { FavoritesFloatingButton } from "@/components/favorites-floating-button";
import { BetaBannerProvider } from "@/components/beta-banner-provider";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { ThemeProvider } from "@/components/theme-provider";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('ui-store');
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    const theme = parsed?.state?.theme || 'dark';
                    document.documentElement.classList.remove('light', 'dark');
                    document.documentElement.classList.add(theme);
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ReactQueryProvider>
            <BetaBannerProvider>
              <div className="min-h-screen flex flex-col">
                <AppHeader />
                <main className="flex-1">
                  {children}
                </main>
                <FavoritesFloatingButton />
              </div>
            </BetaBannerProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
