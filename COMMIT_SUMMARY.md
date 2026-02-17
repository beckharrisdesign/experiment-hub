# Billing, Usage & Pricing UX Improvements

## Usage & Limits
- **Reset date indicator**: Show when AI counter resets (billing cycle for paid, 1st of month for free) in Profile usage and Add/Edit forms
- **Thin bar charts**: Add progress bars for seed packets and AI completions in Profile Usage section
- **Over-limit messaging**: Usage API returns `seedLimit`, `overSeedLimit`; home page banner shows "You have X seeds (limit Y). Upgrade or remove some to add more."
- **Unlimited tier display**: For Serious Hobby, show 35% bar and "X / unlimited" to indicate plenty of headroom

## Profile
- **Upgrade button**: Contextual "Upgrade to [Tier]" below usage stats, links to pricing page
- **Subscription section**: Simplified to show current plan only (removed ProfileTierTable); two secondary buttons: Manage subscription/Upgrade plan + Explore plans
- **Sidebar order**: Password above Usage so Usage and Subscription are adjacent
- **Take a break**: Cancel link below plan cards when on paid plan

## Pricing Page
- **Global billing toggle**: Single Monthly/Yearly toggle above plan cards
- **Current plan indicator**: Fetch subscription on load; show "Current plan" badge, no Subscribe button for current tier
- **Contextual actions**: Upgrade, Switch to [plan], Take a break (downgrade), Cancel (current paid)
- **Loading state**: Wait for auth + subscription before rendering cards to avoid flash of wrong content
- **Visual hierarchy**: Higher contrast for current plan (darker border, stronger bg, ring, shadow); "Most popular" toned down to gray

## Downgrade Handling (Phases 1 & 2)
- Phase 1: Block add when at limit, block AI when over limit (unchanged)
- Phase 2: Over-limit banner with friendly messaging on home page
