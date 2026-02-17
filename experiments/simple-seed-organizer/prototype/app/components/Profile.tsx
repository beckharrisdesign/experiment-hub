'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types/profile';
import { getProfile, saveProfile, getSeedCount } from '@/lib/storage';
import { lookupZone, formatZoneTemperature } from '@/lib/zoneLookup';
import { getGrowingSeasonLength } from '@/data/climate';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { PLANS, getTierIndex, getUpgradeTiers } from '@/lib/plans';

// Helper to format frost dates
function formatFrostDate(dateStr: string): string {
  const [month, day] = dateStr.split('-').map(Number);
  const date = new Date(2024, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper to get current month's average temperature
function getCurrentMonthTemp(climate: { averageTemperatures: Record<string, number> }): number {
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const currentMonth = new Date().getMonth();
  return climate.averageTemperatures[monthNames[currentMonth]] || 0;
}

function ZoneInfoTooltip({
  zone,
  zoneLookupResult,
  zipCode,
  formatZoneTemperature,
  formatFrostDate,
  getGrowingSeasonLength,
  getCurrentMonthTemp,
}: {
  zone: string;
  zoneLookupResult: ReturnType<typeof lookupZone>;
  zipCode: string;
  formatZoneTemperature: (z: string, u: 'F' | 'C') => string;
  formatFrostDate: (s: string) => string;
  getGrowingSeasonLength: (zip: string) => number | null;
  getCurrentMonthTemp: (c: { averageTemperatures: Record<string, number> }) => number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  if (!zoneLookupResult) return null;

  const parts: string[] = [];
  if (zoneLookupResult.zoneInfo) {
    parts.push(`${zoneLookupResult.zoneInfo.description}`);
    parts.push(`Temp: ${formatZoneTemperature(zone, 'F')} (${formatZoneTemperature(zone, 'C')})`);
  }
  if (zoneLookupResult.changed && zoneLookupResult.previousZone) {
    parts.push(`Zone shifted from ${zoneLookupResult.previousZone} to ${zone} in 2024 USDA update.`);
  }
  if (zoneLookupResult.climate) {
    parts.push(`First frost: ${formatFrostDate(zoneLookupResult.climate.averageFirstFrost)}`);
    parts.push(`Last frost: ${formatFrostDate(zoneLookupResult.climate.averageLastFrost)}`);
    const season = getGrowingSeasonLength(zipCode);
    if (season) parts.push(`Growing season: ~${season} days`);
    const monthTemp = getCurrentMonthTemp(zoneLookupResult.climate);
    if (monthTemp) parts.push(`Avg temp this month: ${monthTemp}°F`);
  }
  if (parts.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1.5 ml-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#16a34a]/20 text-[#16a34a] hover:bg-[#16a34a]/30 text-xs font-medium"
        aria-label="Zone details"
      >
        i
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-left">
          <p className="text-xs text-[#4a5565] leading-relaxed whitespace-pre-line">{parts.join('\n\n')}</p>
        </div>
      )}
    </div>
  );
}

// USDA Hardiness Zones - all zones 1-13 with a, b, c subdivisions
const HARDINESS_ZONES = (() => {
  const zones: string[] = [];
  for (let i = 1; i <= 13; i++) zones.push(i.toString());
  for (let i = 1; i <= 13; i++) zones.push(`${i}a`, `${i}b`, `${i}c`);
  return zones.sort((a, b) => {
    const aNum = parseInt(a.replace(/[abc]/g, '')) || 0;
    const bNum = parseInt(b.replace(/[abc]/g, '')) || 0;
    if (aNum !== bNum) return aNum - bNum;
    const aSub = a.match(/[abc]/)?.[0] || '';
    const bSub = b.match(/[abc]/)?.[0] || '';
    const subOrder: Record<string, number> = { '': 0, 'a': 1, 'b': 2, 'c': 3 };
    return (subOrder[aSub] || 0) - (subOrder[bSub] || 0);
  });
})();

interface SubscriptionData {
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  customerId: string | null;
  invoices: { id: string; amountPaid: number; currency: string; date: string | null; hostedUrl: string | null }[];
}

const SECTIONS = [
  { id: 'gardening', label: 'About your garden' },
  { id: 'account', label: 'About you' },
  { id: 'security', label: 'Password' },
  { id: 'usage', label: 'Usage' },
  { id: 'subscription', label: 'Subscription' },
] as const;

export function Profile() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [zipCode, setZipCode] = useState('');
  const [growingZone, setGrowingZone] = useState('');
  const [location, setLocation] = useState('');
  const [zoneLookupResult, setZoneLookupResult] = useState<ReturnType<typeof lookupZone> | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [seedCount, setSeedCount] = useState<number | null>(null);
  const [aiCompletions, setAiCompletions] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string>('account');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const existing = getProfile();
    if (existing) {
      setProfile(existing);
      setZipCode(existing.zipCode || '');
      setGrowingZone(existing.growingZone || '');
      setLocation(existing.location || '');
      if (existing.zipCode) {
        const result = lookupZone(existing.zipCode);
        setZoneLookupResult(result);
        if (result && !existing.growingZone) setGrowingZone(result.zone);
      }
    }
  }, []);

  useEffect(() => {
    if (zipCode.length >= 5) {
      const result = lookupZone(zipCode);
      setZoneLookupResult(result);
      if (result) {
        setGrowingZone(result.zone);
        if (result.location && !location) setLocation(result.location);
      }
    } else setZoneLookupResult(null);
  }, [zipCode, location]);

  useEffect(() => {
    if (!user?.email) {
      setSubscriptionLoading(false);
      return;
    }
    fetch('/api/stripe/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSubscription(data);
      })
      .catch(() => setSubscription(null))
      .finally(() => setSubscriptionLoading(false));
  }, [user?.email]);

  useEffect(() => {
    if (!user) {
      setSeedCount(null);
      setAiCompletions(null);
      return;
    }
    getSeedCount()
      .then(setSeedCount)
      .catch(() => setSeedCount(0));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/ai-usage', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { completions: 0 }))
      .then((data) => setAiCompletions(data.completions ?? 0))
      .catch(() => setAiCompletions(0));
  }, [user]);

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );
    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleManageBilling = async () => {
    if (!subscription?.customerId) return;
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: subscription.customerId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to open billing');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    if (!supabase) {
      setPasswordMessage({ type: 'error', text: 'Not configured' });
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage({ type: 'success', text: 'Password updated' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveGardening = () => {
    saveProfile({
      zipCode: zipCode.trim() || undefined,
      growingZone: growingZone.trim() || undefined,
      location: location.trim() || undefined,
    });
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] w-full pt-20">
      {/* Mini map nav - fixed left sidebar so it stays visible when scrolling */}
      <nav className="hidden lg:block fixed left-0 top-20 bottom-0 w-48 z-10 pl-6 pr-4 py-4 bg-[#f9fafb]">
        <div className="flex flex-col gap-1 pt-4">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === id
                  ? 'bg-[#16a34a] text-white'
                  : 'text-[#4a5565] hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

        {/* Main content - left margin on desktop to clear fixed nav */}
        <main className="min-w-0 px-4 lg:pl-8 lg:pr-8 py-6 pb-24 max-w-3xl lg:ml-48 lg:mr-auto">
          <div className="max-w-2xl">
            {/* Gardening */}
            <section
              id="gardening"
              ref={(el) => { sectionRefs.current.gardening = el; }}
              className="bg-white rounded-xl border border-gray-200 p-6 mb-6 scroll-mt-24"
            >
              <h2 className="text-lg font-semibold text-[#4a5565] mb-4">Gardening info</h2>
              <p className="text-sm text-[#99a1af] mb-4">
                Used for planting dates and zone-specific guidance.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#4a5565] mb-2">Zip Code</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value.replace(/[^\d-]/g, ''))}
                    placeholder="e.g., 78701"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
                    maxLength={10}
                    inputMode="numeric"
                  />
                  {zipCode.length >= 5 && zoneLookupResult && (
                    <p className="mt-1 text-xs text-[#16a34a]">✓ Zone {zoneLookupResult.zone} found</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4a5565] mb-2">Growing Zone</label>
                  <div className="flex items-center gap-3">
                    <select
                      value={growingZone}
                      onChange={(e) => setGrowingZone(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
                    >
                      <option value="">Select zone...</option>
                      {Array.from({ length: 13 }, (_, i) => i + 1).map((zoneNum) => {
                        const baseZone = zoneNum.toString();
                        return (
                          <optgroup key={baseZone} label={`Zone ${baseZone}`}>
                            <option value={baseZone}>{baseZone} (General)</option>
                            <option value={`${baseZone}a`}>{baseZone}a</option>
                            <option value={`${baseZone}b`}>{baseZone}b</option>
                            <option value={`${baseZone}c`}>{baseZone}c</option>
                          </optgroup>
                        );
                      })}
                    </select>
                    {growingZone && (
                      <div className="flex items-center shrink-0">
                        <span className="text-sm text-[#16a34a] font-medium">Zone {growingZone}</span>
                        {zoneLookupResult && (
                          <ZoneInfoTooltip
                            zone={growingZone}
                            zoneLookupResult={zoneLookupResult}
                            zipCode={zipCode}
                            formatZoneTemperature={formatZoneTemperature}
                            formatFrostDate={formatFrostDate}
                            getGrowingSeasonLength={getGrowingSeasonLength}
                            getCurrentMonthTemp={getCurrentMonthTemp}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4a5565] mb-2">Location (optional)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Austin, TX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveGardening}
                    className="min-w-[120px] px-4 py-2 bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </section>

            {/* Account */}
            <section
              id="account"
              ref={(el) => { sectionRefs.current.account = el; }}
              className="bg-white rounded-xl border border-gray-200 p-6 mb-6 scroll-mt-24"
            >
              <h2 className="text-lg font-semibold text-[#4a5565] mb-4">Account</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-[#99a1af] uppercase tracking-wide">Email</p>
                  <p className="text-[#101828]">{user?.email ?? '—'}</p>
                </div>
                {!subscriptionLoading && (
                  <div>
                    <p className="text-xs font-medium text-[#99a1af] uppercase tracking-wide">Plan</p>
                    <p className="text-[#16a34a] font-medium">
                      {subscription?.tier ?? 'Seed Stash Starter'}
                    </p>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled
                    className="min-w-[120px] px-4 py-2 bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </section>

            {/* Security / Password */}
            <section
              id="security"
              ref={(el) => { sectionRefs.current.security = el; }}
              className="bg-white rounded-xl border border-gray-200 p-6 mb-6 scroll-mt-24"
            >
              <h2 className="text-lg font-semibold text-[#4a5565] mb-4">Change password</h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#4a5565] mb-1">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4a5565] mb-1">Confirm password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-transparent"
                    autoComplete="new-password"
                  />
                </div>
                {passwordMessage && (
                  <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-[#16a34a]' : 'text-red-600'}`}>
                    {passwordMessage.text}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="min-w-[120px] px-4 py-2 bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d] disabled:opacity-70"
                  >
                    {passwordLoading ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              </form>
            </section>

            {/* Usage */}
            <section
              id="usage"
              ref={(el) => { sectionRefs.current.usage = el; }}
              className="bg-white rounded-xl border border-gray-200 p-6 mb-6 scroll-mt-24"
            >
              <h2 className="text-lg font-semibold text-[#4a5565] mb-4">Usage</h2>
              <p className="text-sm text-[#99a1af] mb-4">
                Your usage against your plan limits. AI completions reset on your billing cycle.
              </p>
              {seedCount === null && aiCompletions === null ? (
                <p className="text-sm text-[#99a1af]">Loading…</p>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const tier = subscription?.tier ?? 'Seed Stash Starter';
                    const plan = PLANS[getTierIndex(tier)];
                    const seedLimit = plan.seeds === 'Unlimited' ? null : parseInt(plan.seeds, 10);
                    const aiLimit = plan.ai === 'Unlimited' ? null : parseInt(plan.ai.replace('/month', ''), 10);
                    const seeds = seedCount ?? 0;
                    const ai = aiCompletions ?? 0;
                    const seedPct = seedLimit !== null ? Math.min(100, (seeds / seedLimit) * 100) : 35;
                    const aiPct = aiLimit !== null ? Math.min(100, (ai / aiLimit) * 100) : 35;
                    const seedAtLimit = seedLimit !== null && seeds >= seedLimit;
                    const aiAtLimit = aiLimit !== null && ai >= aiLimit;
                    return (
                      <>
                        <div>
                          <p className="text-xs font-medium text-[#99a1af] uppercase tracking-wide">Seed packets</p>
                          <p className="text-[#101828] font-medium">
                            {seeds}
                            {seedLimit !== null ? ` / ${seedLimit}` : ' / unlimited'}
                          </p>
                          <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-[width] ${seedAtLimit ? 'bg-amber-500' : 'bg-[#16a34a]'}`}
                              style={{ width: `${seedPct}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#99a1af] uppercase tracking-wide">AI completions this month</p>
                          <p className="text-[#101828] font-medium">
                            {ai}
                            {aiLimit !== null ? ` / ${aiLimit}` : ' / unlimited'}
                          </p>
                          <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-[width] ${aiAtLimit ? 'bg-amber-500' : 'bg-[#16a34a]'}`}
                              style={{ width: `${aiPct}%` }}
                            />
                          </div>
                          {subscription?.currentPeriodEnd ? (
                            <p className="text-xs text-[#99a1af] mt-1">
                              Resets {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          ) : aiLimit !== null && (
                            <p className="text-xs text-[#99a1af] mt-1">
                              Resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                        {(() => {
                          const upgradeTiers = getUpgradeTiers(tier);
                          const nextTier = upgradeTiers[0];
                          if (!nextTier) return null;
                          return (
                            <div className="flex justify-end pt-2">
                              <Link
                                href="/pricing"
                                className="min-w-[120px] inline-block px-4 py-2 font-medium text-center bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d]"
                              >
                                Upgrade to {nextTier.id}
                              </Link>
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}
                </div>
              )}
            </section>

            {/* Subscription */}
            <section
              id="subscription"
              ref={(el) => { sectionRefs.current.subscription = el; }}
              className="bg-white rounded-xl border border-gray-200 p-6 mb-6 scroll-mt-24"
            >
              <h2 className="text-lg font-semibold text-[#4a5565] mb-4">Subscription</h2>
              {subscriptionLoading ? (
                <p className="text-sm text-[#99a1af]">Loading…</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-[#99a1af] uppercase tracking-wide">Current plan</p>
                    <p className="text-[#16a34a] font-medium">
                      {subscription?.tier ?? 'Seed Stash Starter'}
                    </p>
                  </div>
                  {subscription && subscription.status !== 'free' && subscription.currentPeriodEnd && (
                    <p className="text-xs text-[#99a1af]">
                      {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'}{' '}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 justify-end">
                    {subscription?.customerId ? (
                      <button
                        type="button"
                        onClick={handleManageBilling}
                        disabled={portalLoading}
                        className="min-w-[120px] px-4 py-2 font-medium border border-gray-300 text-[#4a5565] rounded-lg hover:bg-gray-50 disabled:opacity-70"
                      >
                        {portalLoading ? 'Opening…' : 'Manage subscription'}
                      </button>
                    ) : (
                      <Link
                        href="/pricing"
                        className="min-w-[120px] inline-block px-4 py-2 font-medium text-center border border-gray-300 text-[#4a5565] rounded-lg hover:bg-gray-50"
                      >
                        Upgrade plan
                      </Link>
                    )}
                    <Link
                      href="/pricing"
                      className="min-w-[120px] inline-block px-4 py-2 font-medium text-center border border-gray-300 text-[#4a5565] rounded-lg hover:bg-gray-50"
                    >
                      Explore plans
                    </Link>
                  </div>
                  {subscription && subscription.invoices.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-xs font-medium text-[#4a5565] mb-2">Recent charges</p>
                      <ul className="space-y-1 text-xs text-[#99a1af]">
                        {subscription.invoices.slice(0, 5).map((inv) => (
                          <li key={inv.id} className="flex justify-between">
                            <span>{inv.date ? new Date(inv.date).toLocaleDateString() : '—'}</span>
                            <span>
                              ${inv.amountPaid.toFixed(2)}
                              {inv.hostedUrl && (
                                <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-[#16a34a] hover:underline">
                                  Receipt
                                </a>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-[#99a1af] mt-1">Full history in Manage subscription</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>

        {/* Mobile nav - show at bottom on small screens */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2 overflow-x-auto">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium ${
                activeSection === id ? 'bg-[#16a34a] text-white' : 'bg-gray-100 text-[#4a5565]'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 ml-auto"
          >
            Sign out
          </button>
        </div>
      </div>
  );
}
