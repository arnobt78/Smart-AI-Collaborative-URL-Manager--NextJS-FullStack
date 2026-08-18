"use client";

/**
 * HomePage — authenticated marketing home vs Auth.
 * Flash fix: initialWasAuthed from SSR cookie so returning users never paint Auth
 * on hard refresh. Guests (no cookie) see Auth immediately — no spinner.
 */
import { useSession } from "@/hooks/useSession";
import { useWasAuthedHint } from "@/hooks/useWasAuthedHint";
import Auth from "./Auth";
import { LinkIcon, ShareIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { Bubbles, LayoutList, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CreateNewListButton } from "@/components/ui/CreateNewListButton";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { cn } from "@/lib/utils";
import {
  CARD_PAD,
  MARKETING_STACK,
} from "@/lib/ui-spacing";

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
        <div
          className={cn(
            "text-center max-w-3xl mx-auto items-center",
            MARKETING_STACK,
          )}
        >
          <ScrollReveal className="flex justify-center" delay={0} direction="appear">
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
          </ScrollReveal>
          <ScrollReveal delay={160} direction="left">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-medium text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 px-2">
              The Daily Urlist
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={320} direction="right">
            <p className="text-sm sm:text-lg md:text-xl text-white/70 leading-relaxed px-2">
              Create and share lists of URLs easily. Perfect for sharing
              resources, bookmarks, and collections with others.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={480} direction="bottom">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center px-2">
            <CreateNewListButton
              icon={ListPlus}
              className="text-sm px-6 sm:px-8"
            />
            <Button
              href="/lists"
              variant="outline"
              className="text-white border-white/30 hover:bg-white/10 text-sm px-6 sm:px-8 rounded-xl w-full sm:w-auto"
            >
              <LayoutList className="h-5 w-5 shrink-0" aria-hidden />
              View My Lists
            </Button>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 px-4 sm:py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <ScrollReveal
              key={index}
              delay={index * 140}
              parallax
              className={cn(
                "group rounded-xl sm:rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-400/30 flex flex-col gap-2 sm:gap-3",
                CARD_PAD,
              )}
            >
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-lg sm:rounded-xl p-2.5 sm:p-3 inline-block w-fit group-hover:scale-110 transition-transform duration-300 border border-blue-400/30">
                {feature.icon}
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-medium text-white group-hover:text-blue-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-white/60 leading-relaxed">
                {feature.description}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section
        className={cn(
          "py-12 px-4 sm:py-20 sm:px-6 lg:px-8",
          MARKETING_STACK,
        )}
      >
        <ScrollReveal direction="appear">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium text-white text-center text-balance">
            How It Works
          </h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <ScrollReveal delay={0} direction="left" parallax className={cn("text-center flex flex-col items-center gap-2 sm:gap-3", CARD_PAD)}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-400 flex items-center justify-center text-base sm:text-lg lg:text-xl font-medium">
              1
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-medium text-white">
              Create a List
            </h3>
            <p className="text-sm sm:text-base text-white/60">
              Start by creating a new list and give it a memorable name.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={140} direction="bottom" parallax className={cn("text-center flex flex-col items-center gap-2 sm:gap-3", CARD_PAD)}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-400/30 text-purple-400 flex items-center justify-center text-base sm:text-lg lg:text-xl font-medium">
              2
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-medium text-white">
              Add URLs
            </h3>
            <p className="text-sm sm:text-base text-white/60">
              Add your favorite URLs to the list with rich previews.
            </p>
          </ScrollReveal>
          <ScrollReveal
            delay={280}
            direction="right"
            parallax
            className={cn(
              "text-center flex flex-col items-center gap-2 sm:gap-3 sm:col-span-2 lg:col-span-1",
              CARD_PAD,
            )}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 text-indigo-400 flex items-center justify-center text-base sm:text-lg lg:text-xl font-medium">
              3
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-medium text-white">
              Share
            </h3>
            <p className="text-sm sm:text-base text-white/60">
              Share your list with others using a simple URL.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4 sm:py-20 sm:px-6 lg:px-8">
        <div
          className={cn(
            "max-w-3xl text-center mx-auto items-center",
            MARKETING_STACK,
          )}
        >
          <ScrollReveal direction="left" parallax>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium text-white px-2 text-balance">
              Ready to Create Your First List?
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={160} direction="right">
            <p className="text-sm sm:text-base lg:text-xl text-white/60 px-2">
              Start organizing and sharing your favorite URLs today.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={320} direction="bottom">
            <CreateNewListButton
              label="Get Started Now With Your Daily URL List"
              icon={Bubbles}
              className="text-sm px-6 sm:px-8"
            />
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}

export type HomePageProps = {
  /** From cookies() urlist_was_authed — returning users skip Auth on first paint */
  initialWasAuthed?: boolean;
};

export default function HomePage({ initialWasAuthed = false }: HomePageProps) {
  const { user: session, isLoading: sessionLoading } = useSession();
  const wasAuthedHint = useWasAuthedHint(initialWasAuthed);

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
