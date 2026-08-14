/**
 * FloatingBackground — static decorative layers (no animate-float).
 * Server component so hard refresh does not remount a client island and restart CSS.
 * Local public SVGs via next/image — Cloudinary not required.
 */
import Image from "next/image";

export default function FloatingBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden
    >
      <div className="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
        <div className="relative w-full h-full">
          <Image
            src="/global.svg"
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      </div>
      <div className="absolute top-0 right-0 w-full h-full opacity-40 pointer-events-none">
        <div className="relative w-full h-full">
          <Image
            src="/explore.svg"
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      </div>
    </div>
  );
}
