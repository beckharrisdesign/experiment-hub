'use client';

/**
 * Listing evaluation surface (openspec/changes/elk-listing-evaluation).
 * Figma 02.25 lineage: current-state card → opportunity report cards
 * (evidence + citation + "What's in the kit") → full-kit offer.
 *
 * Copy/layout standards (design decisions 14/17/22/23/26): opportunity
 * framing, captions under visuals, no em-dash after tallies, Fraunces
 * sentence-case card headlines, CTAs centered on their own line.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './elk.module.css';
import { track, trackFormSubmit, attributionFromLocation } from '../../lib/etsy-listing-kit/analytics';
import {
  parseEtsyUrl,
  type EvaluationResult,
  type Recommendation,
  type PhotoEvidence,
} from '../../lib/etsy-listing-kit/evaluate';

interface ShopSuggestion {
  listingId: number;
  title: string;
  imageUrl: string | null;
  shopName: string;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'suggestion'; suggestion: ShopSuggestion }
  | { kind: 'result'; evaluation: EvaluationResult };

const SLOT_COUNT = 20;

/** Display names for the shared rubric's Tier B criteria keys. */
const RECOMMENDED_NAMES: Record<string, string> = {
  photos: 'Photos',
  tags: 'Tags',
  tag_length: 'Tag length',
  title_length: 'Title length',
  description_length: 'Description',
  alt_text: 'Alt text',
  video: 'Video',
  styles: 'Styles',
  materials: 'Materials',
  processing_time: 'Processing time',
  return_policy: 'Return policy',
};

/* eslint-disable @next/next/no-img-element */

function PhotoSlots({ photos }: { photos: PhotoEvidence[] }) {
  return (
    <div className={styles.slotGrid}>
      {Array.from({ length: SLOT_COUNT }, (_, i) => {
        const photo = photos[i];
        return photo?.url ? (
          <img key={i} src={photo.url} alt={photo.altText ?? `Listing photo ${i + 1}`} className={styles.slotImg} />
        ) : (
          <div key={i} className={`${styles.slot} ${styles.slotEmpty}`} aria-hidden="true">
            <span className={styles.slotNum}>{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

function CharacterBlocks({ title, headroom }: { title: string; headroom: number }) {
  return (
    <div className={styles.charBox}>
      <span className={styles.charTitle}>{title}</span>
      {Array.from({ length: headroom }, (_, i) => (
        <span key={i} className={styles.charBlock} aria-hidden="true" />
      ))}
      <span className={styles.srOnly}>{headroom} unused title characters</span>
    </div>
  );
}

function Citation({ rec }: { rec: Recommendation }) {
  if (!rec.citation) return null;
  return (
    <div className={styles.citationCol}>
      <p className={styles.citeQuote}>&ldquo;{rec.citation.quote}&rdquo;</p>
      <p className={styles.citeSource}>
        — {rec.citation.sourceTitle} · {rec.citation.checked}
      </p>
    </div>
  );
}

function Evidence({ rec }: { rec: Recommendation }) {
  switch (rec.key) {
    case 'images_open':
    case 'refresh_photos':
      return <PhotoSlots photos={(rec.evidence.photos as PhotoEvidence[]) ?? []} />;
    case 'images_improve': {
      // 02.18: per-photo resolution chips — objectively measurable from the
      // API's image dimensions; the number is the evidence.
      const photos = (rec.evidence.photos as PhotoEvidence[]) ?? [];
      return (
        <div className={styles.altRow}>
          {photos.map((p, i) => (
            <div key={i} className={styles.altCol}>
              {p.url ? (
                <img src={p.url} alt={p.altText ?? `Photo ${i + 1}`} className={styles.altThumb} />
              ) : (
                <div className={styles.altThumb} />
              )}
              {p.shortestSide !== null && (
                <span className={p.belowRecommended ? styles.altChipOff : styles.altChipOn}>
                  {p.belowRecommended ? `${p.shortestSide}px` : `${p.shortestSide}px ✓`}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }
    case 'refresh_tags': {
      const tags = (rec.evidence.tags as string[]) ?? [];
      return (
        <div className={styles.altRow}>
          {tags.map((t, i) => (
            <span key={i} className={styles.altChipOn}>{t}</span>
          ))}
        </div>
      );
    }
    case 'refresh_title':
    case 'title':
      return (
        <CharacterBlocks
          title={String(rec.evidence.title ?? '')}
          headroom={Number(rec.evidence.headroom ?? 0)}
        />
      );
    case 'alt_text': {
      const photos = (rec.evidence.photos as PhotoEvidence[]) ?? [];
      return (
        <div className={styles.altRow}>
          {photos.map((p, i) => (
            <div key={i} className={styles.altCol}>
              {p.url ? (
                <img src={p.url} alt={p.altText ?? `Photo ${i + 1}`} className={styles.altThumb} />
              ) : (
                <div className={styles.altThumb} />
              )}
              <span className={p.altText ? styles.altChipOn : styles.altChipOff}>
                {p.altText ? 'has alt text' : 'no alt text'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    case 'tags': {
      const used = Number(rec.evidence.used ?? 0);
      const max = Number(rec.evidence.max ?? 13);
      return (
        <div className={styles.slotGrid}>
          {Array.from({ length: max }, (_, i) => (
            <div
              key={i}
              className={`${styles.slot} ${i < used ? '' : styles.slotEmpty}`}
              style={i < used ? { background: 'var(--accent-tint)', border: '1px solid var(--accent)' } : undefined}
              aria-hidden="true"
            >
              {i >= used && <span className={styles.slotNum}>{i + 1}</span>}
            </div>
          ))}
        </div>
      );
    }
    case 'video':
      return (
        <div className={styles.videoSlot} aria-hidden="true" />
      );
    default:
      return null;
  }
}

function ReportCard({
  rec,
  rank,
  sampleTitle,
  onBuyKit,
}: {
  rec: Recommendation;
  rank: number;
  sampleTitle: string | null;
  onBuyKit: (placement: string) => void;
}) {
  return (
    <article className={styles.repCard}>
      <span className={styles.recEyebrow}>RECOMMENDATION</span>
      <div className={styles.repHead}>
        <div className={styles.repHeadLeft}>
          <span className={styles.repRank}>{rank}</span>
          <h3 className={styles.repTitle}>{rec.headline}</h3>
        </div>
        <span className={rec.chip.tone === 'muted' ? styles.chipMuted : styles.tag}>{rec.chip.label}</span>
      </div>
      <div className={styles.repBody}>
        <div className={styles.evidence}>
          <Evidence rec={rec} />
          <p className={styles.evCaption}>{rec.caption}</p>
          {(rec.key === 'title' || rec.key === 'refresh_title') && sampleTitle && (
            <div className={styles.sampleBox}>
              <span className={styles.sampleLabel}>WHAT THE KIT WOULD SUGGEST</span>
              <p className={styles.sampleTitle}>&ldquo;{sampleTitle}&rdquo;</p>
              <span className={styles.sampleCount}>{sampleTitle.length} / 140 characters</span>
            </div>
          )}
        </div>
        <Citation rec={rec} />
      </div>
      {rec.key !== 'video' && !((rec.key === 'title' || rec.key === 'refresh_title') && sampleTitle) && (
        <div className={styles.kitBox}>
          <span className={styles.sampleLabel}>WHAT&rsquo;S IN THE KIT</span>
          <p className={`${styles.kitText} ${rec.kit.comingSoon ? styles.kitTeaseText : ''}`}>{rec.kit.text}</p>
          {!rec.kit.comingSoon && (
            <button type="button" className={styles.againBtn} onClick={() => onBuyKit('kit_box')}>
              Buy the whole kit now
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function CurrentStateCard({ evaluation }: { evaluation: EvaluationResult }) {
  const e = evaluation;
  return (
    <section className={styles.stateCard} aria-label="Your listing today">
      <span className={styles.stateLabel}>YOUR LISTING TODAY</span>
      <div className={styles.identityRow}>
        {e.identity.imageUrl ? (
          <img src={e.identity.imageUrl} alt="" className={styles.identThumb} />
        ) : (
          <div className={styles.identThumb} />
        )}
        <div>
          <div className={styles.identTitle}>{e.identity.title}</div>
          <div className={styles.identSub}>
            {e.identity.shopNote} · read{' '}
            {new Date(e.fetchedAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
      <div className={styles.verdictRow}>
        <div className={`${styles.tierPanel} ${styles.tierPass}`}>
          <span className={styles.tierLabel}>ETSY&rsquo;S REQUIRED FIELDS</span>
          <span className={styles.tierValuePass}>
            {e.requiredPass ? '✓ 10 of 10' : `${e.requiredFields.filter((f) => f.present).length} of 10`}
          </span>
        </div>
        <div className={styles.fieldsPanel}>
          <div>
            <span className={styles.stateLabel} style={{ fontSize: 10 }}>
              REQUIRED FIELDS
            </span>
            <div className={styles.fieldsGrid}>
              {e.requiredFields.map((f) => (
                <span key={f.key} className={f.present ? styles.fieldOn : styles.fieldOff}>
                  {f.label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className={styles.stateLabel} style={{ fontSize: 10 }}>
              RECOMMENDED FIELDS
            </span>
            <div className={styles.fieldsGrid}>
              {e.scored.criteria.map((c) => (
                <span key={c.key} className={c.met ? styles.fieldOn : styles.fieldOff}>
                  {RECOMMENDED_NAMES[c.key] ?? c.key}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className={`${styles.tierPanel} ${styles.tierRec}`}>
          <span className={styles.tierLabel}>ETSY&rsquo;S RECOMMENDED EXTRAS</span>
          <span className={styles.tierValueRec}>{e.recommendedInUse}% in use</span>
        </div>
      </div>
    </section>
  );
}

function KitOffer({ state, onBuyKit }: { state: 'gaps' | 'full'; onBuyKit: (placement: string) => void }) {
  return (
    <section className={styles.kitOffer} aria-label="The full listing kit">
      <span className={styles.tag}>THE FULL LISTING KIT</span>
      <h3 className={styles.kitOfferHead}>
        {state === 'full' ? 'A fresh set to test against your current one' : 'Your images, done for you'}
      </h3>
      <div className={styles.kitList}>
        <span>• Ten Etsy-ready images and a reusable template, built from your listing</span>
        <span className={styles.kitTeaseRow}>
          <span className={styles.kitTeaseText}>• A suggested title, 13 tags, and alt text for every photo</span>
          <span className={styles.chipMuted}>COMING SOON</span>
        </span>
        <span className={styles.kitTeaseRow}>
          <span className={styles.kitTeaseText}>• A listing video, cut from your photos</span>
          <span className={styles.chipMuted}>COMING SOON</span>
        </span>
      </div>
      <span className={styles.kitPrice}>$3</span>
      <div className={styles.ctaRow}>
        <button type="button" className={styles.primaryWide} onClick={() => onBuyKit('report_offer')}>
          Build my listing kit
        </button>
      </div>
      <span className={styles.panelFoot}>
        Everything is yours to paste into Shop Manager. We never touch your shop.
      </span>
    </section>
  );
}

/**
 * mode 'landing': the hero form only — submitting navigates to /check so the
 * evaluation has its own shareable URL (3.4a); the buy button is the
 * hero_skip placement and needs the same listing link (02.27: even "skip the
 * check" builds the kit FROM a listing — there is no upload on this path).
 * mode 'check': runs the check (auto-run from the URL param), renders the
 * report, and canonicalizes the address bar to ?listing=<id>.
 */
export default function EvaluationSection({ mode, initialUrl }: { mode: 'landing' | 'check'; initialUrl?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl ?? '');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [buyError, setBuyError] = useState<string | null>(null);
  // Which surface the failed buy started from — the message renders THERE,
  // not up by the form (a kit-card click must not error off-screen).
  const [buyErrorAt, setBuyErrorAt] = useState<'hero' | 'report'>('hero');
  const [buying, setBuying] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const buyErrorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (buyError) buyErrorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [buyError]);

  const check = useCallback(
    async (targetUrl: string) => {
      if (!targetUrl.trim()) return;
      setPhase({ kind: 'checking' });
      track('evaluation_started');
      try {
        const res = await fetch('/etsy-listing-kit/api/evaluate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
        });
        const json = await res.json();
        if (json.kind === 'evaluation') {
          setPhase({ kind: 'result', evaluation: json.evaluation });
          track('evaluation_completed', {
            listing_id: json.evaluation.listingId,
            state: json.evaluation.state,
            recommended_in_use: json.evaluation.recommendedInUse,
          });
          // Canonical, shareable URL for this check (3.4a).
          router.replace(`/etsy-listing-kit/check?listing=${json.evaluation.listingId}`, { scroll: false });
          requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
        } else if (json.kind === 'shop_suggestion') {
          setPhase({ kind: 'suggestion', suggestion: json.suggestion });
        } else {
          setPhase({ kind: 'invalid', reason: json.reason ?? json.error ?? 'We couldn’t check that.' });
          track('evaluation_failed', { reason: json.reason ?? 'unknown' });
        }
      } catch {
        setPhase({ kind: 'invalid', reason: 'We couldn’t check that right now. Nothing was scored.' });
        track('evaluation_failed', { reason: 'network' });
      }
    },
    [router],
  );

  // /check arrives with the listing in the URL — run it without a re-paste.
  const autoRan = useRef(false);
  useEffect(() => {
    if (mode === 'check' && initialUrl && !autoRan.current) {
      autoRan.current = true;
      void check(initialUrl);
    }
  }, [mode, initialUrl, check]);

  /**
   * E4/E5 (02.27 legend): kit_cta_click with its placement, then straight to
   * listing checkout — no upload, no anchor scroll (#433).
   */
  const buyKit = useCallback(async (listingId: number, placement: string) => {
    setBuying(true);
    setBuyError(null);
    setBuyErrorAt(placement === 'hero_skip' ? 'hero' : 'report');
    track('kit_cta_click', { placement, listing_id: listingId });
    track('checkout_started', { listing_id: listingId, placement });
    trackFormSubmit();
    try {
      const res = await fetch('/etsy-listing-kit/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, ...attributionFromLocation() }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout.');
      window.location.href = json.url;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not start checkout.';
      track('checkout_failed', { reason: message });
      setBuyError(message);
      setBuying(false);
    }
  }, []);

  const submit = useCallback(() => {
    if (mode === 'landing') {
      // The check lives at its own URL — shareable, returnable (3.4a).
      router.push(`/etsy-listing-kit/check?url=${encodeURIComponent(url)}`);
      return;
    }
    void check(url);
  }, [mode, url, check, router]);

  const heroSkip = useCallback(() => {
    const parsed = parseEtsyUrl(url);
    if (parsed.kind !== 'listing') {
      setBuyErrorAt('hero');
      setBuyError('Paste your listing’s link first. The kit is built from it.');
      return;
    }
    void buyKit(parsed.listingId, 'hero_skip');
  }, [url, buyKit]);

  const evaluation = phase.kind === 'result' ? phase.evaluation : null;
  const onBuyKit = useCallback(
    (placement: string) => {
      if (evaluation) void buyKit(evaluation.listingId, placement);
    },
    [evaluation, buyKit],
  );

  return (
    <>
      <form
        className={styles.urlForm}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          className={styles.urlInput}
          type="url"
          placeholder="https://www.etsy.com/listing/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="Your Etsy listing URL"
        />
        <div className={styles.ctaPair}>
          <button className={styles.primaryWide} type="submit" disabled={phase.kind === 'checking'}>
            {phase.kind === 'checking' ? (
              <>
                <span className={styles.spinner} aria-hidden="true" /> Reading your listing…
              </>
            ) : (
              'Check my listing'
            )}
          </button>
          <button type="button" className={styles.againBtn} onClick={heroSkip} disabled={buying}>
            {buying ? 'Starting checkout…' : 'Buy the whole kit now'}
          </button>
        </div>
        {phase.kind === 'invalid' && (
          <p className={styles.error} role="alert">
            {phase.reason}
          </p>
        )}
        {buyError && buyErrorAt === 'hero' && (
          <p className={styles.error} role="alert" ref={buyErrorRef}>
            {buyError}
          </p>
        )}
      </form>

      {phase.kind === 'suggestion' && (
        <div className={styles.evalColumn}>
          <p className={styles.evCaption}>That&rsquo;s a shop link. Here&rsquo;s the listing that shop features:</p>
          <div className={styles.suggestCard}>
            {phase.suggestion.imageUrl ? (
              <img src={phase.suggestion.imageUrl} alt="" className={styles.altThumb} />
            ) : (
              <div className={styles.altThumb} />
            )}
            <div className={styles.suggestText}>
              <span className={styles.identTitle}>{phase.suggestion.title}</span>
              <span className={styles.identSub}>Featured in {phase.suggestion.shopName}</span>
            </div>
            <button
              type="button"
              className={styles.button}
              onClick={() => void check(`https://www.etsy.com/listing/${phase.suggestion.listingId}/x`)}
            >
              Check this one
            </button>
          </div>
          <p className={styles.evCaption}>Not this one? Paste that listing&rsquo;s own link instead.</p>
        </div>
      )}

      {evaluation && (
        <div className={styles.evalColumn} ref={resultRef}>
          <CurrentStateCard evaluation={evaluation} />
          {evaluation.state === 'full' && (
            <h2 className={styles.oppsHead}>Nothing to fill. Now make it work harder</h2>
          )}
          {evaluation.recommendations.map((rec, i) => (
            <ReportCard
              key={rec.key}
              rec={rec}
              rank={i + 1}
              sampleTitle={evaluation.sampleTitle}
              onBuyKit={onBuyKit}
            />
          ))}
          <KitOffer state={evaluation.state} onBuyKit={onBuyKit} />
          {buyError && buyErrorAt === 'report' && (
            <p className={styles.error} role="alert" ref={buyErrorRef}>
              {buyError} Nothing was charged.
            </p>
          )}
        </div>
      )}
    </>
  );
}
