/** @figma S8YJQugvMmn5jaRqwFM5XO:7:244 */
export function LandingHero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-[color:var(--green-dark)] px-4 py-16 md:py-24 lg:py-32"
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#86efac] rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#bbf7d0] rounded-full blur-3xl" />
      </div>
      <div className="max-w-[1400px] mx-auto text-center relative z-10">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white">
          Super simple seed inventory.
        </h1>
        <p className="text-xl md:text-2xl text-white mb-2 max-w-2xl mx-auto">
          <strong>No garden planning.</strong> No calendars. No design tools.
        </p>
        <p className="text-xl md:text-2xl text-[#bbf7d0] mb-8 max-w-2xl mx-auto">
          Just your seed inventory, simple and fast.
        </p>
        <a
          href="#signup"
          className="inline-block bg-white hover:bg-gray-100 text-[#166534] font-semibold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg"
        >
          Get started
        </a>
      </div>
    </section>
  );
}
