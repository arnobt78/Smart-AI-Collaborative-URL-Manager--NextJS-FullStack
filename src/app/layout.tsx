import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FloatingBackground from "@/components/layout/FloatingBackground";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/Toaster";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://daily-urlist.vercel.app"),
  title: {
    default: "The Daily Urlist - Organize, Share & Manage Your URL Collections",
    template: "%s | The Daily Urlist",
  },
  description:
    "Create and share beautiful lists of URLs with ease. Organize bookmarks, resources, and collections. Features drag-and-drop reordering, rich previews, custom slugs, notes, reminders, and real-time collaboration. Perfect for sharing resources with others.",
  keywords: [
    "url bookmarking",
    "url organizer",
    "bookmark manager",
    "url list",
    "link organizer",
    "url sharing",
    "bookmark sharing",
    "url collection",
    "resource sharing",
    "url manager",
    "link collection",
    "url aggregator",
    "bookmark tool",
    "url curator",
    "web resource organizer",
    "url library",
    "link manager",
    "url collection tool",
    "bookmark platform",
    "url sharing platform",
  ],
  authors: [
    {
      name: "Arnob Mahmud",
      url: "https://arnob-mahmud.vercel.app/",
    },
  ],
  creator: "Arnob Mahmud",
  publisher: "Arnob Mahmud",
  applicationName: "The Daily Urlist",
  referrer: "origin-when-cross-origin",
  colorScheme: "dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://daily-urlist.vercel.app",
    siteName: "The Daily Urlist",
    title: "The Daily Urlist - Organize, Share & Manage Your URL Collections",
    description:
      "Create and share beautiful lists of URLs with ease. Organize bookmarks, resources, and collections. Features drag-and-drop reordering, rich previews, custom slugs, notes, reminders, and real-time collaboration.",
    images: [
      {
        url: "/favicon.ico",
        width: 512,
        height: 512,
        alt: "The Daily Urlist Logo - URL Bookmarking and Sharing Platform",
        type: "image/x-icon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Daily Urlist - Organize, Share & Manage Your URL Collections",
    description:
      "Create and share beautiful lists of URLs with ease. Organize bookmarks, resources, and collections. Features drag-and-drop reordering, rich previews, and real-time collaboration.",
    images: ["/favicon.ico"],
    creator: "@arnobmahmud",
    site: "@arnobmahmud",
  },
  alternates: {
    canonical: "https://daily-urlist.vercel.app",
  },
  category: "productivity",
  classification: "URL Bookmarking Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${robotoMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <ToastProvider>
            <FloatingBackground />
            <div className="flex flex-col min-h-screen bg-transparent">
              <Navbar />
              <main className="flex-grow mx-auto max-w-7xl w-full py-8 sm:py-12">
                {children}
              </main>
              <Footer />
            </div>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
