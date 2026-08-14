'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './elk.module.css';
import { PRICE_CENTS, UPLOAD } from '../../lib/etsy-listing-kit/config';
import { track, trackFormSubmit } from '../../lib/etsy-listing-kit/analytics';
import { validateUpload, uploadMaxMb } from '../../lib/etsy-listing-kit/upload';

const priceLabel = `$${(PRICE_CENTS / 100).toFixed(PRICE_CENTS % 100 ? 2 : 0)}`;
const acceptAttr = UPLOAD.acceptedMime.join(',');

export default function EtsyListingKitLanding() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<{ id: string; label: string; dataUrl: string }[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<HTMLElement>(null);
  const previewHeadRef = useRef<HTMLHeadingElement>(null);
  // Step start times, so each terminal event carries how long the step took.
  // GA4 can't derive this reliably from event timestamps alone.
  const pickerOpenedAt = useRef<number | null>(null);
  const previewStartedAt = useRef<number | null>(null);
  const elapsed = (from: React.RefObject<number | null>) =>
    from.current === null ? undefined : Math.round(performance.now() - from.current);

  // #336: bring the finished previews to the visitor — they mount below the
  // fold, so without this the page "stays up top" and the click reads as a no-op.
  useEffect(() => {
    if (!previews) return;
    // matchMedia is absent in some embedded webviews (and in jsdom), where an
    // unguarded call throws inside the effect and takes the scroll + focus with
    // it. Missing support just means we can't detect the preference — fall back
    // to animated scroll rather than losing the behavior entirely.
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    previewsRef.current?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    previewHeadRef.current?.focus({ preventScroll: true });
  }, [previews]);

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
    // Feeds the GA4-imported Ads conversion "FormSubmit" (6657647682).
    trackFormSubmit();
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
      // A checkout that never reaches Stripe looks identical to a visitor who
      // simply left, unless we say so explicitly.
      const message = e instanceof Error ? e.message : 'Could not start checkout.';
      track('checkout_failed', { reason: message });
      setError(message);
      setCheckingOut(false);
    }
  }, [file]);

  const generate = useCallback(async () => {
    if (!file) return;
    setGenerating(true); setError(null); setPreviews(null);
    setGenStatus('Building your 6 images…');
    // Slowest step in the funnel (sharp renders 6 images server-side). Without a
    // start event there is no way to measure it or see who abandons during it.
    previewStartedAt.current = performance.now();
    track('preview_requested', { file_type: file.type });
    try {
      const fd = new FormData();
      fd.append('design', file);
      const res = await fetch('/etsy-listing-kit/api/preview', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Preview failed');
      setPreviews(json.previews);
      setGenStatus('Your 6 preview images are ready.');
      track('preview_viewed', {
        image_count: json.previews?.length,
        duration_ms: elapsed(previewStartedAt),
      });
    } catch (e) {
      setGenStatus('');
      const message = e instanceof Error ? e.message : 'Something went wrong generating your preview.';
      track('preview_failed', { reason: message, duration_ms: elapsed(previewStartedAt) });
      setError(message);
    } finally {
      setGenerating(false);
    }
  }, [file]);

  /** File picker opened (button or dropzone click) — the step *before* a file exists. */
  const openPicker = useCallback(() => {
    pickerOpenedAt.current = performance.now();
    track('upload_picker_opened', { had_file: Boolean(file) });
    inputRef.current?.click();
  }, [file]);

  const accept = useCallback((f: File | undefined) => {
    // Picker dismissed with no selection is a real drop-off, but the browser
    // gives us no event for it — the absence of a following upload_* event
    // after upload_picker_opened is the signal.
    if (!f) return;
    const err = validateUpload(f);
    if (err) {
      // Rejected uploads used to be silent: the visitor saw an error and left,
      // and the funnel showed nothing between landing_view and drop-off.
      track('upload_rejected', {
        file_type: f.type || 'unknown',
        file_size_mb: Math.round((f.size / (1024 * 1024)) * 10) / 10,
        reason: err,
        ms_since_picker: elapsed(pickerOpenedAt),
      });
      setError(err); setFile(null); setPreview(null); return;
    }
    setError(null);
    setPreviews(null);
    setFile(f);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
    track('upload_started', {
      file_type: f.type,
      file_size_mb: Math.round((f.size / (1024 * 1024)) * 10) / 10,
      ms_since_picker: elapsed(pickerOpenedAt),
    });
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
        {/* Container is a mouse/drag convenience only; the real keyboard/AT
            control is the "Choose file" button inside (no nested-interactive). */}
        <div
          className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={openPicker}
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
              <span className={styles.dropHint}>PNG · JPG · SVG · up to {uploadMaxMb} MB</span>
            </>
          )}
          <button className={styles.button} type="button" onClick={(e) => { e.stopPropagation(); openPicker(); }}>
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
              {generating ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" /> Building your 6 images…
                </>
              ) : (
                'Preview my 6 listing images →'
              )}
            </button>
          </div>
        )}
        {/* Failure keeps the role="alert" below; this region carries running/ready. */}
        <p className={styles.srOnly} role="status" aria-live="polite">{genStatus}</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>

      {previews && (
        <section className={styles.previewSection} ref={previewsRef}>
          <div>
            <h2 className={styles.previewHead} ref={previewHeadRef} tabIndex={-1}>Here&rsquo;s your set — take a look</h2>
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
            <span className={styles.panelFoot}>
              Secure Stripe checkout · re-download for 7 days · refund by reply · your card statement will show “BHD* ETSY KIT”
            </span>
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
