/** @figma S8YJQugvMmn5jaRqwFM5XO:7:48 */
export function LandingFeaturesSection() {
  return (
    <section id="features" className="px-4 py-16 bg-[#f3f4f6] scroll-mt-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            The simplest way to track your seed collection
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#dcfce7] rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[#16a34a]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-xl mb-2">Quick Inventory</h3>
            <p className="text-[#4a5565] text-sm">
              Add seeds in seconds. Just name, variety, and source. Add details
              later if you want.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-[#dcfce7] rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[#16a34a]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-xl mb-2">Instant Search</h3>
            <p className="text-[#4a5565] text-sm">
              Find any seed in under 10 seconds. Search by name, variety, or
              category.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-[#dcfce7] rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[#16a34a]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-xl mb-2">Use-First List</h3>
            <p className="text-[#4a5565] text-sm">
              See which seeds are expiring soon, so you use them before they go
              bad.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
