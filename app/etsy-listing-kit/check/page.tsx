'use client';

/**
 * /etsy-listing-kit/check — the evaluation's own URL (3.4a, Figma 02.27).
 * Shareable and returnable: ?listing=<id> is the canonical form (the
 * evaluation component rewrites the address bar to it after a check);
 * ?url=<pasted> is how the landing hero hands off raw input, tracking
 * clutter and shop links included. Confirm and error states render here.
 * The api/evaluate cache serves repeat checks within the TTL.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from '../elk.module.css';
import EvaluationSection from '../evaluation';
import { PRICE_CENTS } from '../../../lib/etsy-listing-kit/config';

const priceLabel = `$${(PRICE_CENTS / 100).toFixed(PRICE_CENTS % 100 ? 2 : 0)}`;

function CheckInner() {
  const params = useSearchParams();
  const listing = params.get('listing');
  const rawUrl = params.get('url');
  const initialUrl =
    listing && /^\d+$/.test(listing) ? `https://www.etsy.com/listing/${listing}` : rawUrl ?? undefined;

  return (
    <main className={styles.kit}>
      <header className={styles.header}>
        <Link href="/etsy-listing-kit" className={`${styles.logo} ${styles.logoLink}`}>
          Etsy Listing Kit
        </Link>
        <span className={styles.headerNote}>Free listing check · listing kit {priceLabel}</span>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.h1}>Here&rsquo;s where this listing stands.</h1>
        <p className={styles.sub}>
          Read from the public listing — we never touch your shop.{' '}
          <Link href="/etsy-listing-kit" className={styles.logoLink}>
            Check another listing
          </Link>
        </p>
      </section>

      <EvaluationSection mode="check" initialUrl={initialUrl} />
    </main>
  );
}

export default function CheckPage() {
  return (
    <Suspense fallback={null}>
      <CheckInner />
    </Suspense>
  );
}
