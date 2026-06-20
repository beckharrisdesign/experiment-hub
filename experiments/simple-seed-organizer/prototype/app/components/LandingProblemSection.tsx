/** @figma S8YJQugvMmn5jaRqwFM5XO:7:8 */
export function LandingProblemSection() {
  return (
    <section id="problem" className="px-4 py-16 bg-gray-50 scroll-mt-20">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-[#101828]">
          Stop struggling with your seed collection.
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#dcfce7] rounded-full flex items-center justify-center mx-auto mb-4">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2 text-[#101828]">
              Rebuying duplicates
            </h3>
            <p className="text-[#4a5565] text-sm">
              Can&apos;t remember what you own, so you buy the same seeds again.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-[#dcfce7] rounded-full flex items-center justify-center mx-auto mb-4">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2 text-[#101828]">
              Lost seed info
            </h3>
            <p className="text-[#4a5565] text-sm">
              Can&apos;t find planting depth or spacing when you need it.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-[#dcfce7] rounded-full flex items-center justify-center mx-auto mb-4">
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2 text-[#101828]">
              Wasted seeds
            </h3>
            <p className="text-[#4a5565] text-sm">
              Don&apos;t know which are still viable, so old packets go unused.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
