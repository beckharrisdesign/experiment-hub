'use client';

import { useCallback, useRef, useState } from 'react';
import styles from './elk.module.css';
import { PRICE_CENTS, UPLOAD } from '../../lib/etsy-listing-kit/config';

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
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback((f: File | undefined) => {
    if (!f) return;
    const err = validate(f);
    if (err) { setError(err); setFile(null); setPreview(null); return; }
    setError(null);
    setFile(f);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
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
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>

      <div className={styles.trust}>
        <span>✓ See a full preview before you pay</span>
        <span>✓ {priceLabel} one-time — no subscription</span>
        <span>✓ Instant download + email</span>
      </div>
    </main>
  );
}
