export default function AboutPage() {
  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-0">
        <h1 className="text-lg sm:text-xl  font-medium text-white ">
          About The Daily Urlist
        </h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-base sm:text-lg text-white/80 ">
            The Daily Urlist is a modern URL bookmarking and sharing platform
            designed to help you organize and share your favorite web resources
            efficiently. Built with Next.js and featuring real-time
            collaboration, AI-powered organization, and beautiful
            visualizations.
          </p>
          <h2 className="text-lg sm:text-xl font-medium text-white mt-6 sm:mt-8  sm:mb-4">
            Our Mission
          </h2>
          <p className="text-base sm:text-lg text-white/80 ">
            We aim to simplify the way people collect, organize, and share web
            resources. Whether you&apos;re a researcher, student, professional,
            or just someone who loves to curate content, The Daily Urlist
            provides you with the tools to manage your digital resources
            effectively.
          </p>
          <h2 className="text-lg sm:text-xl font-medium text-white mt-6 sm:mt-8  sm:mb-4">
            Features
          </h2>
          <ul className="list-disc list-inside text-base sm:text-lg text-white/80  space-y-2">
            <li>
              Create and manage multiple URL lists with drag-and-drop reordering
            </li>
            <li>
              Share lists with custom URLs and public/private visibility
              controls
            </li>
            <li>
              Rich previews with automatic metadata extraction for all your
              links
            </li>
            <li>Organize with titles, descriptions, tags, and categories</li>
            <li>Real-time collaboration with team members and permissions</li>
            <li>AI-powered collection suggestions and duplicate detection</li>
            <li>Business insights and analytics for your URLs and lists</li>
            <li>Secure authentication and data protection</li>
          </ul>
          <h2 className="text-lg sm:text-xl font-medium text-white mt-6 sm:mt-8  sm:mb-4">
            Contact
          </h2>
          <p className="text-base sm:text-lg text-white/80">
            Have questions or suggestions? Feel free to reach out to us at{" "}
            <a
              href="mailto:contact@arnobmahmud.com"
              className="text-blue-400 hover:text-blue-300 "
            >
              contact@arnobmahmud.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
