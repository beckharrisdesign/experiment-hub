'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './elk.module.css';
import { PRICE_CENTS, UPLOAD } from '../../lib/etsy-listing-kit/config';
import { track } from '../../lib/etsy-listing-kit/analytics';

const priceLabel = `$${(PRICE_CENTS / 100).toFixed(PRICE_CENTS % 100 ? 2 : 0)}`;
const acceptAttr = UPLOAD.acceptedMime.join(',');

function validate(file: File): string | null {
  if (!(UPLOAD.acceptedMime as readonly string[]).includes(file.type)) {
    return 'That file type isn’t supported — please use a PNG, JPG, or SVG.';
  }
  if (file.size > UPLOAD.maxBytes) {
    const mb = Math.round(UPLOAD.maxBytes / (1024 * 1024));
    return `That file is a bit big — please keep it under ${mb} MB.`;
  }
  return null;
}

export default function EtsyListingKitLanding() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<{ id: string; label: string; dataUrl: string }[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Funnel: landing view + cancel-return detection.
  useEffect(() => {
    track('landing_view');
    if (new URLSearchParams(window.location.search).get('canceled')) {
      setCanceled(true);
      track('payment_cancelled');
    }
  }, []);

  const checkout = useCallback(async () => {
    if (!file) return;
    setCheckingOut(true); setError(null);
    track('checkout_started');
    try {
      const fd = new FormData();
      fd.append('design', file);
      // carry ad attribution through Checkout
      const q = new URLSearchParams(window.location.search);
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
        const v = q.get(k); if (v) fd.append(k, v);
      }
      const clickId = q.get('gclid') || q.get('fbclid'); if (clickId) fd.append('click_id', clickId);
      fd.append('landing_path', window.location.pathname);
      const res = await fetch('/etsy-listing-kit/api/checkout', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout.');
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.');
      setCheckingOut(false);
    }
  }, [file]);

  const generate = useCallback(async () => {
    if (!file) return;
    setGenerating(true); setError(null); setPreviews(null);
    try {
      const fd = new FormData();
      fd.append('design', file);
      const res = await fetch('/etsy-listing-kit/api/preview', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Preview failed');
      setPreviews(json.previews);
      track('preview_viewed', { image_count: json.previews?.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong generating your preview.');
    } finally {
      setGenerating(false);
    }
  }, [file]);

  const accept = useCallback((f: File | undefined) => {
    if (!f) return;
    const err = validate(f);
    if (err) { setError(err); setFile(null); setPreview(null); return; }
    setError(null);
    setPreviews(null);
    setFile(f);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
    track('upload_started', { file_type: f.type });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    accept(e.dataTransfer.files?.[0]);
  }, [accept]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (item) accept(item.getAsFile() ?? undefined);
  }, [accept]);

  return (
    <main className={styles.kit} onPaste={onPaste}>
      <header className={styles.header}>
        <span className={styles.logo}>Etsy Listing Kit</span>
        <span className={styles.headerNote}>One design → 6 Etsy-ready images · {priceLabel}</span>
      </header>

      {canceled && (
        <div className={styles.banner} role="status">
          No charge — your work&rsquo;s still here. Re-add your design below whenever you&rsquo;re ready.
        </div>
      )}

      <section className={styles.hero}>
        <span className={styles.eyebrow}>FOR EMBROIDERY &amp; CRAFT SELLERS</span>
        <h1 className={styles.h1}>You made the design.<br />We&rsquo;ll make it look good on Etsy.</h1>
        <p className={styles.sub}>
          Drop in your design and get six listing photos that look shop-worthy — sized for Etsy and ready to post in minutes.
        </p>
      </section>

      <div className={styles.uploadWrap}>
        <div
          className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        >
          {preview ? (
            <div className={styles.thumbRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Your uploaded design" className={styles.thumb} />
              <span className={styles.fileName}>{file?.name} — looks good. Next: preview your pack.</span>
            </div>
          ) : (
            <>
              <span className={styles.dropTitle}>⬆ Drop your design here (or paste it)</span>
              <span className={styles.dropHint}>PNG · JPG · SVG · up to {Math.round(UPLOAD.maxBytes / (1024 * 1024))} MB</span>
            </>
          )}
          <button className={styles.button} type="button" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
            {file ? 'Choose a different file' : 'Choose file'}
          </button>
          <input
            ref={inputRef}
            className={styles.hiddenInput}
            type="file"
            accept={acceptAttr}
            onChange={(e) => accept(e.target.files?.[0])}
          />
        </div>
        {file && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button className={styles.primaryWide} type="button" onClick={generate} disabled={generating}>
              {generating ? 'Building your 6 images…' : 'Preview my 6 listing images →'}
            </button>
          </div>
        )}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>

      {previews && (
        <section className={styles.previewSection}>
          <div>
            <h2 className={styles.previewHead}>Here&rsquo;s your set — take a look</h2>
            <p className={styles.previewSub}>
              These are just previews (that&rsquo;s the watermark). Pay once and the clean, full-size six are yours to keep.
            </p>
            <div className={styles.grid}>
              {previews.map((p) => (
                <div key={p.id} className={styles.gridCell}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.dataUrl} alt={p.label} className={styles.gridImg} />
                  <div className={styles.gridLabel}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>
          <aside className={styles.panel}>
            <span className={styles.tag}>⚡ INSTANT DOWNLOAD</span>
            <span className={styles.price}>{priceLabel}</span>
            <span className={styles.priceNote}>one-time · all 6 images</span>
            <button className={styles.primaryWide} type="button" onClick={checkout} disabled={checkingOut}>
              {checkingOut ? 'Starting checkout…' : `Pay ${priceLabel} & download →`}
            </button>
            <strong style={{ fontSize: 13 }}>What lands in your inbox:</strong>
            <ul className={styles.panelList}>
              <li>• Six full-size photos (2000px)</li>
              <li>• No watermark, sized for Etsy</li>
              <li>• Zip download + emailed link</li>
              <li>• Yours to re-grab for 7 days</li>
            </ul>
            <span className={styles.panelFoot}>Secure Stripe checkout · re-download for 7 days · refund by reply</span>
          </aside>
        </section>
      )}

      <div className={styles.trust}>
        <span>✓ See a full preview before you pay</span>
        <span>✓ {priceLabel} one-time — no subscription</span>
        <span>✓ Instant download + email</span>
      </div>
    </main>
  );
}
