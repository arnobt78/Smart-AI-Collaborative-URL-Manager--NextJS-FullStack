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
  title: "The Urlist - Share Your URLs",
  description:
    "Create and share lists of URLs easily. Perfect for sharing resources, bookmarks, and collections with others.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "The Urlist - Share Your URLs",
    description:
      "Create and share lists of URLs easily. Perfect for sharing resources, bookmarks, and collections with others.",
    images: [
      {
        url: "/favicon.ico",
        width: 512,
        height: 512,
        alt: "The Urlist Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Urlist - Share Your URLs",
    description:
      "Create and share lists of URLs easily. Perfect for sharing resources, bookmarks, and collections with others.",
    images: ["/favicon.ico"],
  },
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
              <main className="flex-grow container mx-auto px-6 py-8">
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
