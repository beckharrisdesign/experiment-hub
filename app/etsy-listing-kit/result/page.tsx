'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from '../elk.module.css';
import { track } from '../../../lib/etsy-listing-kit/analytics';

interface OrderImage { id: string; label: string; url: string; }

function ResultInner() {
  const params = useSearchParams();
  const orderId = params.get('order');
  const [status, setStatus] = useState<string>('loading');
  const [images, setImages] = useState<OrderImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    if (!orderId) { setError('Missing order reference.'); return; }
    try {
      const res = await fetch(`/etsy-listing-kit/api/order?order=${encodeURIComponent(orderId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lookup failed');
      setStatus(json.status);
      if (json.images) setImages(json.images);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your order.');
    }
  }, [orderId]);

  // Poll until fulfilled (webhook fulfils just after payment).
  useEffect(() => {
    poll();
    const t = setInterval(() => { if (status !== 'fulfilled') poll(); }, 3000);
    return () => clearInterval(t);
  }, [poll, status]);

  useEffect(() => { if (status === 'fulfilled') track('result_delivered'); }, [status]);

  const ready = status === 'fulfilled' && images;

  return (
    <main className={styles.kit}>
      <header className={styles.header}>
        <span className={styles.logo}>Etsy Listing Kit</span>
        {orderId && <span className={styles.headerNote}>order #{orderId.slice(0, 8)}</span>}
      </header>

      <section className={styles.hero}>
        {error ? (
          <>
            <h1 className={styles.h1}>We hit a snag</h1>
            <p className={styles.sub}>{error} If you paid, your download link is also in your email — or reply to your receipt and we&rsquo;ll sort it.</p>
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
          <div className={styles.grid}>
            {images!.map((img) => (
              <a key={img.id} className={styles.gridCell} href={img.url} download={`${img.id}.jpg`} style={{ textDecoration: 'none' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.label} className={styles.gridImg} />
                <div className={styles.gridLabel}>⬇ {img.label}</div>
              </a>
            ))}
          </div>
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
