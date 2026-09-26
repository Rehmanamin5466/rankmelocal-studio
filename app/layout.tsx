import { Toaster } from "@/components/ui/sonner"
import { Providers } from "@/components/providers";
import type { Metadata } from "next";
import { Caprasimo, Figtree, JetBrains_Mono } from "next/font/google";
import { getBaseUrl } from "@/lib/base-url";
import { cn } from "@/lib/utils";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

// Rank Me Local display face: single weight (400), used for the wordmark only.
const caprasimo = Caprasimo({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-caprasimo",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});
const appUrl = getBaseUrl();
const socialImage = "/images/social-card.png";
const description = "Edit your website content with Rank Me Local";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    template: "%s | Rank Me Local Studio",
    default: "Rank Me Local Studio",
  },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: "Rank Me Local Studio",
    title: "Rank Me Local Studio",
    description,
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: "Rank Me Local Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rank Me Local Studio",
    description,
    images: [socialImage],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {  
	return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          figtree.variable,
          caprasimo.variable,
          jetbrainsMono.variable,
        )}
      >
        <Providers user={null}>
          {children}
        </Providers>
        <Toaster/>
      </body>
    </html>
  );
}
