'use client';

import { PLANS, getTierIndex } from '@/lib/plans';

interface ProfileTierTableProps {
  currentTier: string;
  onManageBilling?: () => void;
  manageBillingLoading?: boolean;
}

export function ProfileTierTable({
  currentTier,
  onManageBilling,
  manageBillingLoading,
}: ProfileTierTableProps) {
  const currentIdx = getTierIndex(currentTier);
  const isPaid = currentIdx > 0;

  return (
    <div className="grid md:grid-cols-3 gap-4 lg:gap-6">
      {PLANS.map((plan) => {
        const isCurrent = plan.id === currentTier;

        return (
          <div
            key={plan.id}
            className={`rounded-xl border-2 p-5 flex flex-col ${
              isCurrent ? 'border-[#16a34a] bg-[#f0fdf4]' : 'border-gray-200 bg-white'
            }`}
          >
            <h3 className="text-lg font-bold text-[#101828] mb-1">{plan.id}</h3>
            <p className="text-sm text-[#4a5565] mb-3">
              {plan.monthlyPrice === 'Free' ? 'Free, forever' : `${plan.monthlyPrice}/mo`}
            </p>
            <ul className="space-y-1 text-sm text-gray-700 mb-4 flex-1">
              <li className="flex gap-2">
                <span className="text-[#16a34a] shrink-0">✓</span>
                {plan.seeds === 'Unlimited' ? 'Unlimited seed packets' : `${plan.seeds} seed packets`}
              </li>
              <li className="flex gap-2">
                <span className="text-[#16a34a] shrink-0">✓</span>
                {plan.ai === 'Unlimited' ? 'Unlimited AI packets' : `${plan.ai.replace('/month', '')} AI packets/month`}
              </li>
            </ul>
            <div className="mt-auto">
              {isCurrent && (
                <span className="block w-full py-2 text-center text-sm font-medium text-[#16a34a]">
                  Current plan
                </span>
              )}
            </div>
          </div>
        );
      })}
      {isPaid && onManageBilling && (
        <p className="md:col-span-3 text-xs text-[#99a1af] mt-1">
          Upgrades and downgrades are managed in billing.
        </p>
      )}
    </div>
  );
}
