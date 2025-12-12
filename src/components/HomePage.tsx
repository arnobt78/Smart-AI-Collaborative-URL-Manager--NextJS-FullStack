"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import Auth from "./Auth";
import { LinkIcon, ShareIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

const features = [
  {
    icon: <LinkIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />,
    title: "Easy to Create",
    description:
      "Create lists in seconds with our simple interface. Add URLs, titles, and descriptions effortlessly.",
  },
  {
    icon: <ShareIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />,
    title: "Share Instantly",
    description:
      "Share your lists with anyone using a simple URL. Perfect for sharing resources, bookmarks, and collections.",
  },
  {
    icon: <PhotoIcon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-400" />,
    title: "Rich Previews",
    description:
      "Beautiful previews for all your saved URLs, including titles, descriptions, and images.",
  },
];

interface SessionUser {
  id: string;
  email: string;
}

export default function HomePage() {
  const {
    user: session,
    isLoading: sessionLoading,
    isFetching: sessionFetching,
  } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // CRITICAL: Show skeleton during initial mount or loading
  // This prevents showing stale cached session data or homepage UI before session is confirmed
  // Show skeleton if:
  // 1. Not mounted yet (prevents hydration mismatch and shows skeleton instead of homepage/Auth)
  // 2. Initial loading (isLoading = true, no cache yet - first visit or empty cache)
  // Note: Once session state is confirmed (null = no user, user object = logged in), show Auth/Homepage
  // We don't check sessionFetching here because it can be true even after we have confirmed session state
  // This ensures skeleton shows only during initial load, then Auth/Homepage shows immediately
  const shouldShowSkeleton = !mounted || sessionLoading;

  // Show skeleton loading while mounted is false, loading, or fetching
  if (shouldShowSkeleton) {
    return (
      <div className="min-h-screen w-full">
        {/* Hero Section Skeleton */}
        <section className="relative py-8 px-2 sm:py-12 sm:px-0">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-8">
              {/* Icon box skeleton: p-4 (16px) + 48px image = 80px total */}
              <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 animate-pulse" />
            </div>
            {/* Title skeleton: text-3xl sm:text-4xl md:text-5xl */}
            <div className="h-8 sm:h-10 md:h-12 bg-white/10 backdrop-blur-sm rounded-xl w-3/4 mx-auto mb-6 animate-pulse" />
            {/* Description skeleton: text-base sm:text-lg md:text-xl */}
            <div className="h-5 sm:h-6 md:h-7 bg-white/10 backdrop-blur-sm rounded-lg w-full mx-auto mb-8 animate-pulse" />
            {/* Buttons skeleton: py-3 = h-12 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="h-12 bg-white/10 backdrop-blur-sm rounded-xl w-full sm:w-auto px-8 animate-pulse" />
              <div className="h-12 bg-white/10 backdrop-blur-sm rounded-xl w-full sm:w-auto px-8 animate-pulse" />
            </div>
          </div>
        </section>

        {/* Features Section Skeleton */}
        <section className="py-16 px-4 sm:py-20 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="group p-6 sm:p-8 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm shadow-lg"
              >
                {/* Icon box skeleton: p-3 + h-8 w-8 icon = ~56px total */}
                <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl mb-4 animate-pulse border border-white/10" />
                {/* Title skeleton: text-lg sm:text-xl */}
                <div className="h-6 sm:h-7 bg-white/10 backdrop-blur-sm rounded-lg mb-3 animate-pulse" />
                {/* Description skeleton */}
                <div className="h-4 bg-white/10 backdrop-blur-sm rounded w-full animate-pulse" />
                <div className="h-4 bg-white/10 backdrop-blur-sm rounded w-3/4 mt-2 animate-pulse" />
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section Skeleton */}
        <section className="py-16 px-4 sm:py-20 sm:px-6">
          {/* Title skeleton: text-2xl sm:text-3xl */}
          <div className="h-8 sm:h-9 bg-white/10 backdrop-blur-sm rounded-xl w-1/3 mx-auto mb-8 sm:mb-12 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center p-4 sm:p-6">
                {/* Numbered circle skeleton: w-10 h-10 sm:w-12 sm:h-12 */}
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-sm rounded-full mx-auto mb-4 animate-pulse border border-white/10" />
                {/* Title skeleton: text-lg sm:text-xl */}
                <div className="h-6 sm:h-7 bg-white/10 backdrop-blur-sm rounded-lg mb-2 animate-pulse" />
                {/* Description skeleton */}
                <div className="h-4 bg-white/10 backdrop-blur-sm rounded w-full animate-pulse" />
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section Skeleton */}
        <section className="py-16 px-4 sm:py-20 sm:px-6">
          <div className="max-w-3xl text-center mx-auto">
            {/* Title skeleton: text-2xl sm:text-3xl */}
            <div className="h-8 sm:h-9 bg-white/10 backdrop-blur-sm rounded-xl w-2/3 mx-auto mb-6 animate-pulse" />
            {/* Description skeleton: text-base sm:text-xl */}
            <div className="h-5 sm:h-7 bg-white/10 backdrop-blur-sm rounded-lg w-full mx-auto mb-8 animate-pulse" />
            {/* Button skeleton: py-3 = h-12, with px-8 */}
            <div className="h-12 bg-white/10 backdrop-blur-sm rounded-xl w-full sm:w-auto mx-auto px-8 animate-pulse" />
          </div>
        </section>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen w-full">
      {/* Hero Section */}
      <section className="relative py-6 px-4 sm:py-12 sm:px-6 lg:px-0">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 inline-block border border-blue-400/30">
              <OptimizedImage
                src="/favicon.ico"
                alt="Explore"
                width={48}
                height={48}
                className="text-blue-400 w-10 h-10 sm:w-12 sm:h-12"
                publicAsset
              />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 px-2">
            The Daily Urlist
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-white/70 mb-6 sm:mb-8 leading-relaxed px-2">
            Create and share lists of URLs easily. Perfect for sharing
            resources, bookmarks, and collections with others.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
            <Button
              href="/new"
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white text-base sm:text-lg font-semibold px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
            >
              Create New List
            </Button>
            <Button
              href="/lists"
              variant="outline"
              className="text-white border-white/30 hover:bg-white/10 text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl w-full sm:w-auto"
            >
              View My Lists
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 px-4 sm:py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-400/30"
            >
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-lg sm:rounded-xl p-2.5 sm:p-3 inline-block mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 border border-blue-400/30">
                {feature.icon}
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-2 sm:mb-3 group-hover:text-blue-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-white/60 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 px-4 sm:py-20 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white text-center mb-6 sm:mb-8 lg:mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="text-center p-4 sm:p-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 text-blue-400 flex items-center justify-center text-base sm:text-lg lg:text-xl font-semibold mx-auto mb-3 sm:mb-4">
              1
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-2">
              Create a List
            </h3>
            <p className="text-sm sm:text-base text-white/60">
              Start by creating a new list and give it a memorable name.
            </p>
          </div>
          <div className="text-center p-4 sm:p-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 text-purple-400 flex items-center justify-center text-base sm:text-lg lg:text-xl font-semibold mx-auto mb-3 sm:mb-4">
              2
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-2">
              Add URLs
            </h3>
            <p className="text-sm sm:text-base text-white/60">
              Add your favorite URLs to the list with rich previews.
            </p>
          </div>
          <div className="text-center p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-500/20 backdrop-blur-sm border border-indigo-400/30 text-indigo-400 flex items-center justify-center text-base sm:text-lg lg:text-xl font-semibold mx-auto mb-3 sm:mb-4">
              3
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-2">
              Share
            </h3>
            <p className="text-sm sm:text-base text-white/60">
              Share your list with others using a simple URL.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4 sm:py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl text-center mx-auto">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-6 px-2">
            Ready to Create Your First List?
          </h2>
          <p className="text-sm sm:text-base lg:text-xl text-white/60 mb-6 sm:mb-8 px-2">
            Start organizing and sharing your favorite URLs today.
          </p>
          <Button
            href="/new"
            className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white text-sm sm:text-base lg:text-lg font-semibold px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
          >
            Get Started Now With Your Daily URL List
          </Button>
        </div>
      </section>
    </div>
  );
}
