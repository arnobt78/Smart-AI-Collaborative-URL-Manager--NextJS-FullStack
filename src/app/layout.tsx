import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Roboto_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FloatingBackground from "@/components/layout/FloatingBackground";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PostHogPageview } from "@/components/providers/PostHogProvider";
import { ToastProvider } from "@/components/ui/Toaster";
import { AuthToastBridge } from "@/components/AuthToastBridge";
import { WAS_AUTHED_COOKIE } from "@/constants/auth";
import { isWasAuthedCookieValue } from "@/lib/was-authed";
// DISABLED: UserDataPrefetcher causes duplicate API calls
// import { UserDataPrefetcher } from "@/components/prefetch/UserDataPrefetcher";

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
    default: "The Daily Urlist | Smart AI Collaborative URL Bookmark Manager",
    template: "%s | The Daily Urlist",
  },
  description:
    "The Daily Urlist — a smart AI collaborative URL bookmark manager. Create, organize, and share URL lists with drag-and-drop, rich previews, custom slugs, notes, reminders, AI enhancement, vector search, import/export (Chrome, Pocket, Pinboard), and real-time collaboration. Live demo: https://daily-urlist.vercel.app/",
  keywords: [
    "The Daily Urlist",
    "Smart AI Collaborative URL Bookmark Manager",
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
    "bookmark platform",
    "url sharing platform",
    "AI bookmark manager",
    "collaborative bookmarks",
    "vector search bookmarks",
    "Next.js bookmark app",
    "TanStack React Query",
    "Prisma PostgreSQL",
    "real-time SSE collaboration",
    "Chrome Pocket Pinboard import",
    "Arnob Mahmud",
  ],
  authors: [
    {
      name: "Arnob Mahmud",
      url: "https://www.arnobmahmud.com",
    },
  ],
  creator: "Arnob Mahmud",
  publisher: "Arnob Mahmud",
  applicationName: "The Daily Urlist",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
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
    url: "https://daily-urlist.vercel.app/",
    siteName: "The Daily Urlist",
    title: "The Daily Urlist | Smart AI Collaborative URL Bookmark Manager",
    description:
      "Organize, share, and collaborate on URL collections with AI enhancement, vector search, drag-and-drop, rich previews, and real-time updates. Built by Arnob Mahmud.",
    images: [
      {
        url: "https://github.com/user-attachments/assets/7369ad36-5a47-4e30-97ed-f6fab885515f",
        width: 1200,
        height: 630,
        alt: "The Daily Urlist — Smart AI Collaborative URL Bookmark Manager demo screenshot",
        type: "image/png",
      },
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
    title: "The Daily Urlist | Smart AI Collaborative URL Bookmark Manager",
    description:
      "AI collaborative URL bookmark manager: lists, rich previews, import/export, vector search, and real-time collaboration. https://daily-urlist.vercel.app/",
    images: [
      "https://github.com/user-attachments/assets/7369ad36-5a47-4e30-97ed-f6fab885515f",
    ],
    creator: "@arnobmahmud",
    site: "@arnobmahmud",
  },
  alternates: {
    canonical: "https://daily-urlist.vercel.app/",
  },
  category: "productivity",
  classification: "URL Bookmarking Platform",
  abstract:
    "Full-stack Next.js URL bookmarking platform with AI, collaboration, and semantic search.",
  bookmarks: ["https://daily-urlist.vercel.app/"],
  archives: [
    "https://github.com/arnobt78/Daily-URL-Bookmark-Notes-Dairy--NextJS-FullStack",
  ],
  assets: ["https://daily-urlist.vercel.app/favicon.ico"],
  other: {
    "contact:email": "contact@arnobmahmud.com",
    "author:email": "contact@arnobmahmud.com",
    "author:website": "https://www.arnobmahmud.com",
    "project:demo": "https://daily-urlist.vercel.app/",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SSR wasAuthed / session_token → Navbar profile skeleton on first paint
  const cookieStore = await cookies();
  const initialWasAuthed =
    isWasAuthedCookieValue(cookieStore.get(WAS_AUTHED_COOKIE)?.value) ||
    Boolean(cookieStore.get("session_token")?.value);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "The Daily Urlist",
        alternateName: "Smart AI Collaborative URL Bookmark Manager",
        url: "https://daily-urlist.vercel.app/",
        description:
          "Create, organize, and share URL lists with AI enhancement, vector search, and real-time collaboration.",
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        author: {
          "@type": "Person",
          name: "Arnob Mahmud",
          url: "https://www.arnobmahmud.com",
          email: "contact@arnobmahmud.com",
        },
      },
      {
        "@type": "Person",
        name: "Arnob Mahmud",
        url: "https://www.arnobmahmud.com",
        email: "contact@arnobmahmud.com",
        sameAs: [
          "https://github.com/arnobt78",
          "https://www.linkedin.com/in/arnob-mahmud-05839655/",
        ],
      },
    ],
  };

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${robotoMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <QueryProvider>
          <ToastProvider>
            {/* Pending welcome/goodbye toasts survive hard redirects */}
            <AuthToastBridge />
            {/* DISABLED: UserDataPrefetcher causes duplicate API calls and slow page loads */}
            {/* <UserDataPrefetcher /> */}
            {/* Static BG outside Suspense — never remounts with searchParams */}
            <FloatingBackground />
            <div className="flex flex-col min-h-screen bg-transparent">
              <Navbar initialWasAuthed={initialWasAuthed} />
              <main className="flex-grow mx-auto max-w-7xl w-full px-2 sm:px-4 py-6 sm:py-10">
                {children}
              </main>
              <Footer />
            </div>
            {/* PostHog island only — useSearchParams must not blank chrome */}
            <Suspense fallback={null}>
              <PostHogPageview />
            </Suspense>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
