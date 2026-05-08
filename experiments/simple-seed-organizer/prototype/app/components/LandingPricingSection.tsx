import { PricingCard } from "./PricingCard";

const PRICE_IDS = {
  homeGarden: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_MONTHLY,
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_HOME_GARDEN_YEARLY,
  },
  seriousHobby: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_MONTHLY,
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_SERIOUS_HOBBY_YEARLY,
  },
};

export interface LandingPricingSectionProps {
  onSubscribe: (priceId: string) => void;
  loadingPriceId: string | null;
}

/** @figma S8YJQugvMmn5jaRqwFM5XO:7:84 */
export function LandingPricingSection({
  onSubscribe,
  loadingPriceId,
}: LandingPricingSectionProps) {
  return (
    <section id="pricing" className="px-4 py-16 bg-white scroll-mt-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple plans for real‑life gardeners
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start free, stay free as long as you like, and only upgrade if you
            need a little extra help.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {/* Stash Starter — Figma `7:93`. Copy SSOT: shipped prototype (“50 AI packets/month”); Figma text `7:111` aligned pass 3. */}
          <div className="rounded-xl border-2 border-gray-200 bg-white p-6 flex flex-col">
            <h3 className="text-xl font-bold text-[#101828] mb-1">
              Stash Starter
            </h3>
            <p className="text-sm text-[#4a5565] mb-4">
              Seed organizing + photos
            </p>
            <ul className="space-y-2 text-sm text-gray-700 mb-6 flex-1">
              <li className="flex gap-2">
                <span className="text-[#16a34a] shrink-0">✓</span>
                50 seed packets
              </li>
              <li className="flex gap-2">
                <span className="text-[#16a34a] shrink-0">✓</span>
                50 AI packets/month
              </li>
            </ul>
            <p className="text-lg font-bold text-[#101828]">Free, forever</p>
            <a
              href="#signup"
              className="mt-4 block w-full py-3 text-center bg-[#16a34a] text-white font-semibold rounded-lg hover:bg-[#15803d] transition-colors"
            >
              Get started
            </a>
          </div>

          <PricingCard
            title="Home Garden"
            subTitle="Seed + Planting Calendar"
            badge="Most popular"
            highlight
            features={["300 seed packets", "20 AI packets/month"]}
            monthlyPrice="$5"
            yearlyPrice="$49"
            yearlyDiscount="18% off"
            priceIds={PRICE_IDS.homeGarden}
            onSubscribe={onSubscribe}
            loadingPriceId={loadingPriceId}
          />

          <PricingCard
            title="Serious Hobby"
            subTitle="Succession & Microclimate"
            features={[
              "Unlimited seed packets",
              "Unlimited AI packets/month",
            ]}
            monthlyPrice="$15"
            yearlyPrice="$144"
            yearlyDiscount="20% off"
            priceIds={PRICE_IDS.seriousHobby}
            onSubscribe={onSubscribe}
            loadingPriceId={loadingPriceId}
          />
        </div>
      </div>
    </section>
  );
}
