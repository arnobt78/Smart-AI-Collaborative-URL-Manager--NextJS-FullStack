export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-2 sm:px-0">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">
          Privacy Policy
        </h1>
        <div className="prose prose-sm sm:prose-lg">
          <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">
            At The Urlist, we take your privacy seriously. This privacy policy
            explains how we collect, use, and protect your personal information.
          </p>
          <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 mt-6 sm:mt-8 mb-2 sm:mb-4">
            Information We Collect
          </h2>
          <ul className="list-disc list-inside text-base sm:text-lg text-gray-600 mb-4 sm:mb-6 space-y-2">
            <li>Email address for account creation and authentication</li>
            <li>URLs and metadata you choose to save</li>
            <li>Usage data to improve our service</li>
          </ul>
          <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 mt-6 sm:mt-8 mb-2 sm:mb-4">
            How We Use Your Information
          </h2>
          <ul className="list-disc list-inside text-base sm:text-lg text-gray-600 mb-4 sm:mb-6 space-y-2">
            <li>To provide and maintain our service</li>
            <li>To notify you about changes to our service</li>
            <li>To provide customer support</li>
            <li>To detect, prevent and address technical issues</li>
          </ul>
          <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 mt-6 sm:mt-8 mb-2 sm:mb-4">
            Data Security
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">
            We implement appropriate security measures to protect your personal
            information. Your data is stored securely on our servers and is only
            accessible to authorized personnel.
          </p>
          <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 mt-6 sm:mt-8 mb-2 sm:mb-4">
            Contact Us
          </h2>
          <p className="text-base sm:text-lg text-gray-600">
            If you have any questions about our privacy policy, please contact
            us at arnob_t78@yahoo.com
          </p>
        </div>
      </div>
    </div>
  );
}
