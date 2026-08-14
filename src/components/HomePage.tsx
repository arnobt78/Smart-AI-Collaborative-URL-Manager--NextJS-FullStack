"use client";

/**
 * HomePage — authenticated marketing home vs Auth.
 * Flash fix: guests see Auth (wasAuthed default false). No full-page spinner —
 * returning users (wasAuthed) see marketing while session RQ resolves.
 */
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import Auth from "./Auth";
import { LinkIcon, ShareIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { WAS_AUTHED_KEY } from "@/constants/auth";

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

/** Static marketing home — no session wait / spinner. */
function MarketingHome() {
  return (
    <div className="min-h-screen w-full">
      {/* Hero Section */}
      <section className="relative py-6 px-4 sm:py-12 sm:px-6 lg:px-0">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="bg-blue-500/20 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 inline-block border border-blue-400/30">
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
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center px-2">
            <Button
              href="/new"
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white text-base sm:text-lg font-semibold px-6 sm:px-8 py-2 sm:py-3 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
            >
              Create New List
            </Button>
            <Button
              href="/lists"
              variant="outline"
              className="text-white border-white/30 hover:bg-white/10 text-base sm:text-lg px-6 sm:px-8 py-2 sm:py-3 rounded-xl w-full sm:w-auto"
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
              className="group p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-400/30"
            >
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-lg sm:rounded-xl p-2.5 sm:p-3 inline-block mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 border border-blue-400/30">
                {feature.icon}
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white  sm:mb-3 group-hover:text-blue-400 transition-colors">
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
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-400 flex items-center justify-center text-base sm:text-lg lg:text-xl font-semibold mx-auto mb-3 sm:mb-4">
              1
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white ">
              Create a List
            </h3>
            <p className="text-sm sm:text-base text-white/60">
              Start by creating a new list and give it a memorable name.
            </p>
          </div>
          <div className="text-center p-4 sm:p-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-400/30 text-purple-400 flex items-center justify-center text-base sm:text-lg lg:text-xl font-semibold mx-auto mb-3 sm:mb-4">
              2
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white ">
              Add URLs
            </h3>
            <p className="text-sm sm:text-base text-white/60">
              Add your favorite URLs to the list with rich previews.
            </p>
          </div>
          <div className="text-center p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 text-indigo-400 flex items-center justify-center text-base sm:text-lg lg:text-xl font-semibold mx-auto mb-3 sm:mb-4">
              3
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white ">
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
            className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white text-sm sm:text-base lg:text-lg font-semibold px-6 sm:px-8 py-2 sm:py-3 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
          >
            Get Started Now With Your Daily URL List
          </Button>
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  const { user: session, isLoading: sessionLoading } = useSession();
  const [mounted, setMounted] = useState(false);
  // Default false = Auth for guests (SSR + first paint); no null spinner wait
  const [wasAuthedHint, setWasAuthedHint] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setWasAuthedHint(localStorage.getItem(WAS_AUTHED_KEY) === "1");
    } catch {
      setWasAuthedHint(false);
    }
  }, []);

  // Sync hint when session resolves (logout clears key in ProfileDropdown)
  useEffect(() => {
    if (!mounted) return;
    if (session?.email) {
      localStorage.setItem(WAS_AUTHED_KEY, "1");
      setWasAuthedHint(true);
    } else if (!sessionLoading && !session) {
      localStorage.removeItem(WAS_AUTHED_KEY);
      setWasAuthedHint(false);
    }
  }, [mounted, session, sessionLoading]);

  // Confirmed session → marketing
  if (session) {
    return <MarketingHome />;
  }

  // Guest / cold visit → Auth immediately (no marketing flash, no spinner)
  if (!wasAuthedHint) {
    return <Auth />;
  }

  // Returning user hint while session RQ loads → static marketing (no spinner)
  if (sessionLoading) {
    return <MarketingHome />;
  }

  // Hint stale / logged out after load
  return <Auth />;
}
