export default function PrivacyPage() {
  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6 sm:mb-8">
          Privacy Policy
        </h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-base sm:text-lg text-white/80 mb-4 sm:mb-6">
            At The Daily Urlist, we take your privacy seriously. This privacy
            policy explains how we collect, use, and protect your personal
            information.
          </p>
          <h2 className="text-xl sm:text-2xl font-semibold text-white mt-6 sm:mt-8  sm:mb-4">
            Information We Collect
          </h2>
          <ul className="list-disc list-inside text-base sm:text-lg text-white/80 mb-4 sm:mb-6 space-y-2">
            <li>Email address for account creation and authentication</li>
            <li>URLs and metadata you choose to save in your lists</li>
            <li>Usage data and analytics to improve our service</li>
            <li>Session information for authentication and security</li>
            <li>Collaboration data when you share lists with others</li>
          </ul>
          <h2 className="text-xl sm:text-2xl font-semibold text-white mt-6 sm:mt-8  sm:mb-4">
            How We Use Your Information
          </h2>
          <ul className="list-disc list-inside text-base sm:text-lg text-white/80 mb-4 sm:mb-6 space-y-2">
            <li>To provide and maintain our service</li>
            <li>To notify you about changes to our service</li>
            <li>To provide customer support and respond to inquiries</li>
            <li>To detect, prevent and address technical issues</li>
            <li>To enable collaboration features when you share lists</li>
            <li>
              To generate business insights and analytics (anonymized where
              possible)
            </li>
          </ul>
          <h2 className="text-xl sm:text-2xl font-semibold text-white mt-6 sm:mt-8  sm:mb-4">
            Data Security
          </h2>
          <p className="text-base sm:text-lg text-white/80 mb-4 sm:mb-6">
            We implement appropriate security measures to protect your personal
            information. Your data is stored securely using industry-standard
            encryption on our servers and is only accessible to authorized
            personnel. We use secure authentication methods and regularly update
            our security practices.
          </p>
          <h2 className="text-xl sm:text-2xl font-semibold text-white mt-6 sm:mt-8  sm:mb-4">
            Data Retention
          </h2>
          <p className="text-base sm:text-lg text-white/80 mb-4 sm:mb-6">
            We retain your personal information for as long as your account is
            active or as needed to provide our services. If you delete your
            account, we will delete or anonymize your personal information in
            accordance with our data retention policies.
          </p>
          <h2 className="text-xl sm:text-2xl font-semibold text-white mt-6 sm:mt-8  sm:mb-4">
            Contact Us
          </h2>
          <p className="text-base sm:text-lg text-white/80">
            If you have any questions about our privacy policy, please contact
            us at{" "}
            <a
              href="mailto:arnob_t78@yahoo.com"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              arnob_t78@yahoo.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
