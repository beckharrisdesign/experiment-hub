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

import { useCallback, useRef, useState } from 'react';
import styles from './elk.module.css';
import { track } from '../../lib/etsy-listing-kit/analytics';
import type {
  EvaluationResult,
  Recommendation,
  PhotoEvidence,
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
    case 'images_improve':
      return <PhotoSlots photos={(rec.evidence.photos as PhotoEvidence[]) ?? []} />;
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
              <span className={styles.altChip}>{p.altText ? 'has alt text' : 'no alt text'}</span>
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
        <div className={styles.videoSlot} aria-hidden="true">
          ▶
        </div>
      );
    default:
      return null;
  }
}

function ReportCard({
  rec,
  rank,
  sampleTitle,
  onSkipToKit,
}: {
  rec: Recommendation;
  rank: number;
  sampleTitle: string | null;
  onSkipToKit: () => void;
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
          {rec.key === 'title' && sampleTitle && (
            <div className={styles.sampleBox}>
              <span className={styles.sampleLabel}>WHAT THE KIT WOULD SUGGEST</span>
              <p className={styles.sampleTitle}>&ldquo;{sampleTitle}&rdquo;</p>
              <span className={styles.sampleCount}>{sampleTitle.length} / 140 characters</span>
            </div>
          )}
        </div>
        <Citation rec={rec} />
      </div>
      <div className={styles.kitBox}>
        <span className={styles.sampleLabel}>WHAT&rsquo;S IN THE KIT</span>
        <p className={`${styles.kitText} ${rec.kit.comingSoon ? styles.kitTeaseText : ''}`}>{rec.kit.text}</p>
        {!rec.kit.comingSoon && (
          <button type="button" className={styles.skipLink} onClick={onSkipToKit}>
            Skip to the full kit ↓
          </button>
        )}
      </div>
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
          <div className={styles.identSub}>{e.identity.shopNote}</div>
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
          <span className={styles.stateLabel} style={{ fontSize: 10 }}>
            FIELDS
          </span>
          <div className={styles.fieldsGrid}>
            {e.requiredFields.map((f) => (
              <span key={f.key} className={`${styles.fieldItem} ${f.present ? '' : styles.fieldMiss}`}>
                {f.present ? '✓' : '–'} {f.label}
              </span>
            ))}
          </div>
        </div>
        <div className={`${styles.tierPanel} ${styles.tierRec}`}>
          <span className={styles.tierLabel}>ETSY&rsquo;S RECOMMENDED EXTRAS</span>
          <span className={styles.tierValueRec}>{e.recommendedInUse}% in use</span>
        </div>
      </div>
      <p className={styles.explainer}>
        Required fields are pass/fail — they get you published. The percentage grades only Etsy&rsquo;s
        recommended checklist (photos, title, tags, alt text, video) — the guidance that gets you found.
      </p>
    </section>
  );
}

function KitOffer({ state, onSkipToKit }: { state: 'gaps' | 'full'; onSkipToKit: () => void }) {
  return (
    <section className={styles.kitOffer} aria-label="The full listing kit">
      <span className={styles.tag}>⚡ THE FULL LISTING KIT</span>
      <h3 className={styles.kitOfferHead}>
        {state === 'full' ? 'A fresh set to test against your current one' : 'Every opportunity above, done for you'}
      </h3>
      <div className={styles.kitList}>
        <span>• Ten new or updated images, on brand and ready to upload</span>
        <span>• A suggested title that works all 140 characters</span>
        <span>• 13 suggested tags, drawn from your listing and Etsy&rsquo;s guidance</span>
        <span>• Alt text written for every photo</span>
        <span>• A template to make more images yourself</span>
        <span className={styles.kitTeaseRow}>
          <span className={styles.kitTeaseText}>• A listing video, cut from your photos</span>
          <span className={styles.chipMuted}>COMING SOON</span>
        </span>
      </div>
      <span className={styles.kitPrice}>$3</span>
      <div className={styles.ctaRow}>
        <button type="button" className={styles.primaryWide} onClick={onSkipToKit}>
          Build my listing kit →
        </button>
      </div>
      <span className={styles.panelFoot}>
        Everything is yours to paste into Shop Manager — we never touch your shop.
      </span>
    </section>
  );
}

export default function EvaluationSection({ onGoToKit }: { onGoToKit: () => void }) {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const resultRef = useRef<HTMLDivElement>(null);

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
    [],
  );

  const skipToKit = useCallback(() => {
    track('pack_offer_click');
    onGoToKit();
  }, [onGoToKit]);

  const evaluation = phase.kind === 'result' ? phase.evaluation : null;

  return (
    <>
      <form
        className={styles.urlForm}
        onSubmit={(e) => {
          e.preventDefault();
          void check(url);
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
        <div className={styles.ctaRow}>
          <button className={styles.primaryWide} type="submit" disabled={phase.kind === 'checking'}>
            {phase.kind === 'checking' ? (
              <>
                <span className={styles.spinner} aria-hidden="true" /> Reading your listing…
              </>
            ) : (
              'Check my listing →'
            )}
          </button>
        </div>
        <button type="button" className={styles.skipLink} onClick={skipToKit}>
          Just want the images? Skip straight to the $3 kit ↓
        </button>
        {phase.kind === 'invalid' && (
          <p className={styles.error} role="alert">
            {phase.reason}
          </p>
        )}
      </form>

      {phase.kind === 'suggestion' && (
        <div className={styles.evalColumn}>
          <p className={styles.evCaption}>That&rsquo;s a shop link — here&rsquo;s the listing that shop features:</p>
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
              Check this one →
            </button>
          </div>
          <p className={styles.evCaption}>Not this one? Paste that listing&rsquo;s own link instead.</p>
        </div>
      )}

      {evaluation && (
        <div className={styles.evalColumn} ref={resultRef}>
          <CurrentStateCard evaluation={evaluation} />
          <h2 className={styles.oppsHead}>
            {evaluation.state === 'full'
              ? 'Nothing to fill — now make it work harder'
              : 'Your biggest opportunities'}
          </h2>
          {evaluation.recommendations.map((rec, i) => (
            <ReportCard
              key={rec.key}
              rec={rec}
              rank={i + 1}
              sampleTitle={evaluation.sampleTitle}
              onSkipToKit={skipToKit}
            />
          ))}
          <KitOffer state={evaluation.state} onSkipToKit={skipToKit} />
        </div>
      )}
    </>
  );
}
