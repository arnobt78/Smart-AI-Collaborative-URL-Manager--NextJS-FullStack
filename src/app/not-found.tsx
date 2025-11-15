import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] py-10 sm:py-16 px-4">
      <div className="text-center">
        <h1 className="text-4xl sm:text-6xl font-bold text-blue-600 mb-4">
          404
        </h1>
        <h2 className="text-xl sm:text-3xl font-semibold text-gray-900 mb-2">
          Page Not Found
        </h2>
        <p className="text-base sm:text-lg text-gray-600 mb-8">
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-all duration-200 text-base sm:text-lg"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
