'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from '../elk.module.css';
import { track, trackAdsConversion } from '../../../lib/etsy-listing-kit/analytics';

interface OrderImage { id: string; label: string; url: string; }
interface KitText {
  suggestedTitle: string;
  tags: string[];
  altTexts: { rank: number; alt: string }[];
}

function ResultInner() {
  const params = useSearchParams();
  const orderId = params.get('order');
  const [status, setStatus] = useState<string>('loading');
  const [images, setImages] = useState<OrderImage[] | null>(null);
  // Listing-kit orders only; null on upload-era orders AND when the composer
  // didn't run (kitText unavailable) — the two render differently below.
  const [kitText, setKitText] = useState<KitText | null>(null);
  const [isListingKit, setIsListingKit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Landed-on-result → fulfilled. This is the post-payment wait the buyer feels.
  const arrivedAt = useRef<number>(performance.now());

  const poll = useCallback(async () => {
    if (!orderId) { setError('Missing order reference.'); return; }
    try {
      const res = await fetch(`/etsy-listing-kit/api/order?order=${encodeURIComponent(orderId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lookup failed');
      setStatus(json.status);
      if (json.images) setImages(json.images);
      if ('kitText' in json) { setIsListingKit(true); setKitText(json.kitText); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your order.');
    }
  }, [orderId]);

  // Poll until fulfilled (webhook fulfils just after payment).
  useEffect(() => {
    poll();
    const done = ['fulfilled', 'refunded', 'failed'];
    const t = setInterval(() => { if (!done.includes(status)) poll(); }, 3000);
    return () => clearInterval(t);
  }, [poll, status]);

  useEffect(() => {
    if (status === 'fulfilled') {
      track('result_delivered', { wait_ms: Math.round(performance.now() - arrivedAt.current) });
      if (orderId) trackAdsConversion(orderId);
    }
    if (status === 'refunded' || status === 'failed') {
      track('processing_failed', { status, wait_ms: Math.round(performance.now() - arrivedAt.current) });
    }
  }, [status, orderId]);

  const ready = status === 'fulfilled' && images;
  const covered = status === 'refunded' || status === 'failed';

  return (
    <main className={styles.kit}>
      <header className={styles.header}>
        {/* #360: the wordmark is the way back to the start — a buyer who wants a
            second set had no route out of this page. */}
        <Link href="/etsy-listing-kit" className={`${styles.logo} ${styles.logoLink}`}
              onClick={() => track('restart_clicked', { from: 'result_header' })}>
          Etsy Listing Kit
        </Link>
        {orderId && <span className={styles.headerNote}>order #{orderId.slice(0, 8)}</span>}
      </header>

      <section className={styles.hero}>
        {error ? (
          <>
            <h1 className={styles.h1}>We hit a snag</h1>
            <p className={styles.sub}>{error} If you paid, your download link is also in your email — or reply to your receipt and we&rsquo;ll sort it.</p>
          </>
        ) : covered ? (
          <>
            <h1 className={styles.h1}>Something went wrong — you&rsquo;re covered</h1>
            <p className={styles.sub}>
              Your payment went through, but we hit a snag building your images and couldn&rsquo;t finish. We&rsquo;ve automatically refunded you in full — nothing for you to do. Reply to your receipt if you&rsquo;d like to try again.
            </p>
          </>
        ) : ready ? (
          <>
            <h1 className={styles.h1}>All set — your photos are ready</h1>
            <p className={styles.sub}>
              All six, clean and full-size, ready to download. A copy of this link is in your inbox too. Re-download anytime for 7 days.
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.h1}>Putting your set together…</h1>
            <p className={styles.sub}>
              Payment confirmed. This usually takes under a minute — the page will update itself. Feel free to close it; we&rsquo;ll email your link.
            </p>
          </>
        )}
      </section>

      {ready && (
        <section className={styles.previewSection} style={{ gridTemplateColumns: '1fr' }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <a className={styles.primaryWide} href={`/etsy-listing-kit/api/download?order=${encodeURIComponent(orderId!)}`}
               style={{ display: 'inline-block', textDecoration: 'none' }} download
               onClick={() => track('download_clicked', { kind: 'zip' })}>
              ⬇ Download everything (.zip)
            </a>
          </div>
          <div className={styles.grid}>
            {images!.map((img) => (
              <a key={img.id} className={styles.gridCell} href={img.url} download={`${img.id}.jpg`} style={{ textDecoration: 'none' }}
                 onClick={() => track('download_clicked', { kind: 'single', image_id: img.id })}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.label} className={styles.gridImg} />
                <div className={styles.gridLabel}>⬇ {img.label}</div>
              </a>
            ))}
          </div>
        </section>
      )}

      {ready && isListingKit && (
        <section className={styles.previewSection} style={{ gridTemplateColumns: '1fr' }}>
          {kitText ? (
            <>
              <div className={styles.identCard}>
                <div className={styles.identTitle}>Your title — paste into Shop Manager</div>
                <p style={{ margin: '6px 0 4px' }}>{kitText.suggestedTitle}</p>
                <div className={styles.gridLabel}>{kitText.suggestedTitle.length} / 140 characters</div>
              </div>
              <div className={styles.identCard}>
                <div className={styles.identTitle}>{kitText.tags.length} tags</div>
                <p style={{ margin: '6px 0 4px' }}>{kitText.tags.join(', ')}</p>
              </div>
              <div className={styles.identCard}>
                <div className={styles.identTitle}>Alt text, one per image</div>
                {kitText.altTexts.map((a) => (
                  <p key={a.rank} style={{ margin: '6px 0 0' }}>{a.rank}. {a.alt}</p>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.identCard}>
              <div className={styles.identTitle}>Title, tags &amp; alt text</div>
              <p style={{ margin: '6px 0 4px' }}>
                These aren&rsquo;t available for this order — your images and template are all here,
                and we&rsquo;re on the hook for the text. Reply to your email and we&rsquo;ll sort it.
              </p>
            </div>
          )}
        </section>
      )}

      {ready && (
        <section className={styles.againWrap}>
          <hr className={styles.againRule} />
          <p className={styles.againLead}>Got another design?</p>
          <p className={styles.againSub}>
            Same six photos, same $3 — takes about a minute.
          </p>
          <Link href="/etsy-listing-kit" className={styles.againBtn}
                onClick={() => track('restart_clicked', { from: 'result_cta' })}>
            Make another set
          </Link>
        </section>
      )}
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={null}>
      <ResultInner />
    </Suspense>
  );
}
