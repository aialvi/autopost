import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="text-xl font-semibold tracking-tight text-neutral-900">
              AutoPost
            </div>
            <nav className="flex items-center gap-6">
              <Link
                href="/login"
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="bg-neutral-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Get started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-neutral-900 mb-6">
            Automate your social media & ads
          </h1>
          <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
            Connect your store, manage multiple brands, track profits, and let AI
            optimize your marketing — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-neutral-900 text-white px-6 py-3 rounded-md font-medium hover:bg-neutral-800 transition-colors"
            >
              Start free trial
            </Link>
            <Link
              href="/login"
              className="border border-neutral-300 bg-white px-6 py-3 rounded-md font-medium hover:bg-neutral-50 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-12 text-center">
            Everything you need to grow
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-lg border border-neutral-200">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-neutral-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">
                Multi-brand Management
              </h3>
              <p className="text-neutral-600 text-sm">
                Manage multiple brands from a single dashboard. Switch between
                brands instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg border border-neutral-200">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-neutral-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">
                Shopify Integration
              </h3>
              <p className="text-neutral-600 text-sm">
                Connect your Shopify store in one click. Sync products and orders
                automatically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg border border-neutral-200">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-neutral-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">
                Ad Platform Connections
              </h3>
              <p className="text-neutral-600 text-sm">
                Connect Facebook Ads, Google Ads, and TikTok Ads to manage all
                your campaigns.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-lg border border-neutral-200">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-neutral-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">
                Profit Analytics
              </h3>
              <p className="text-neutral-600 text-sm">
                Track revenue, costs, and profits in real-time. Visualize your
                growth with detailed charts.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-lg border border-neutral-200">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-neutral-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">
                AI-Powered Insights
              </h3>
              <p className="text-neutral-600 text-sm">
                Get intelligent recommendations, anomaly detection, and trend
                analysis powered by AI.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-lg border border-neutral-200">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-neutral-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">
                Smart Notifications
              </h3>
              <p className="text-neutral-600 text-sm">
                Stay informed with Telegram notifications for important events
                and alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-semibold text-white mb-4">
            Ready to automate your growth?
          </h2>
          <p className="text-neutral-400 mb-8">
            Start your free trial today. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-neutral-900 px-6 py-3 rounded-md font-medium hover:bg-neutral-100 transition-colors"
          >
            Get started now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-neutral-100 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto text-center text-sm text-neutral-500">
          <p>&copy; {new Date().getFullYear()} AutoPost. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
