"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Inline,
  Stack,
} from "@beckharrisdesign/mvds";
import {
  CORSI_BLOCKS,
  FLASH_GAP_MS,
  FLASH_ON_MS,
  PRE_RESPONSE_MS,
  TRIALS_PER_SPAN,
  expectedResponse,
  generateSequence,
  initialRunState,
  isCorrect,
  recordTrial,
  scoreRun,
  type CorsiCondition,
  type CorsiRunState,
  type CorsiSession,
} from "@/lib/exec-function/corsi";
import { useRecorder } from "../components/useRecorder";
import SaveNotice from "../components/SaveNotice";
import TimingWarning from "../components/TimingWarning";
import CompletionOverlay from "../components/CompletionOverlay";
import { useVisibilityGuard } from "../components/useVisibilityGuard";

/**
 * The Corsi block-tapping task.
 *
 * Phases: `ready` -> (`showing` -> `responding` -> `feedback`)* -> `done`.
 * Only the presentation is timed; the response window is open-ended, as it is
 * in the standard administration — the measure is sequence length, not speed.
 *
 * There is deliberately no undo on a tap. The standard administration scores
 * the sequence a participant produces, and letting them walk a wrong tap back
 * would score a corrected sequence instead, which is a different measurement.
 */

type Phase = "ready" | "showing" | "pause" | "responding" | "feedback" | "done";

interface Props {
  condition: CorsiCondition;
}

export default function CorsiTask({ condition }: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [run, setRun] = useState<CorsiRunState>(initialRunState);
  const [sequence, setSequence] = useState<number[]>([]);
  const [litBlock, setLitBlock] = useState<number | null>(null);
  const [taps, setTaps] = useState<number[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [celebrating, setCelebrating] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { record, result, saving } = useRecorder();
  const { interrupted } = useVisibilityGuard(phase !== "ready" && phase !== "done");

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Any unmount mid-presentation must not leave timers firing into a dead tree.
  useEffect(() => clearTimers, [clearTimers]);

  /** Flash one sequence, then open the response window. */
  const present = useCallback(
    (toShow: number[]) => {
      clearTimers();
      setPhase("showing");
      setTaps([]);
      setLitBlock(null);

      toShow.forEach((blockId, i) => {
        const onAt = i * (FLASH_ON_MS + FLASH_GAP_MS);
        timers.current.push(setTimeout(() => setLitBlock(blockId), onAt));
        timers.current.push(setTimeout(() => setLitBlock(null), onAt + FLASH_ON_MS));
      });

      const total = toShow.length * (FLASH_ON_MS + FLASH_GAP_MS);
      timers.current.push(setTimeout(() => setPhase("pause"), total));
      timers.current.push(setTimeout(() => setPhase("responding"), total + PRE_RESPONSE_MS));
    },
    [clearTimers],
  );

  const startTrial = useCallback(
    (state: CorsiRunState) => {
      const next = generateSequence(state.span);
      setSequence(next);
      present(next);
    },
    [present],
  );

  const begin = useCallback(() => {
    const fresh = initialRunState();
    setRun(fresh);
    setLastCorrect(null);
    setStartedAt(Date.now());
    startTrial(fresh);
  }, [startTrial]);

  // Read at save time, not at render time, so the flag reflects the whole run.
  const interruptedRef = useRef(false);
  useEffect(() => {
    interruptedRef.current = interrupted;
  }, [interrupted]);

  /** Finish the run: score it, then write it to the log. */
  const finish = useCallback(
    async (finalState: CorsiRunState, elapsedMs: number) => {
      const score = scoreRun(finalState.results);
      const session: CorsiSession = {
        id: "",
        timestamp: new Date().toISOString(),
        condition,
        durationMs: elapsedMs,
        trials: finalState.results,
        timingReliable: !interruptedRef.current,
        ...score,
      };

      await record({
        module: "corsi",
        variant: condition,
        durationMs: elapsedMs,
        headline: score.totalScore,
        detail: session,
      });
      setCelebrating(true);
    },
    [condition, record],
  );

  const submitTaps = useCallback(
    (finalTaps: number[]) => {
      const correct = isCorrect(sequence, finalTaps, condition);
      setLastCorrect(correct);
      setPhase("feedback");

      const nextRun = recordTrial(run, {
        sequence,
        response: finalTaps,
        correct,
      });
      setRun(nextRun);

      timers.current.push(
        setTimeout(() => {
          if (nextRun.finished) {
            setPhase("done");
            void finish(nextRun, Date.now() - startedAt);
          } else {
            startTrial(nextRun);
          }
        }, 900),
      );
    },
    [condition, finish, run, sequence, startTrial, startedAt],
  );

  const tapBlock = useCallback(
    (blockId: number) => {
      if (phase !== "responding") return;
      const next = [...taps, blockId];
      setTaps(next);
      // The trial ends as soon as the participant has produced as many taps as
      // the sequence was long — there is no separate submit step to forget.
      if (next.length === sequence.length) submitTaps(next);
    },
    [phase, sequence.length, submitTaps, taps],
  );

  const score = scoreRun(run.results);
  const expected = expectedResponse(sequence, condition);

  return (
    <Stack gap={24}>
      <Card>
        <CardHeader>
          <Inline gap={8} align="center" justify="between">
            <CardTitle>
              Corsi block-tapping — {condition === "forward" ? "forward" : "backward"}
            </CardTitle>
            {phase !== "ready" && phase !== "done" && (
              <Badge variant="muted">
                Span {run.span} · trial {run.trialIndex + 1} of {TRIALS_PER_SPAN}
              </Badge>
            )}
          </Inline>
        </CardHeader>

        <CardContent>
          <Stack gap={16}>
            {phase === "ready" && (
              <Stack gap={16}>
                <p className="text-sm text-muted-foreground">
                  Blocks will light up one at a time. Then tap them{" "}
                  {condition === "forward" ? (
                    <strong className="font-medium text-foreground">in the same order</strong>
                  ) : (
                    <strong className="font-medium text-foreground">in reverse order</strong>
                  )}
                  . Sequences get longer until you miss both tries at a length.
                  Taps cannot be taken back.
                </p>
                <Inline gap={8}>
                  <Button onClick={begin} size="lg" className="min-h-12 px-8">
                    Start
                  </Button>
                </Inline>
              </Stack>
            )}

            {(phase === "showing" || phase === "pause") && (
              <p aria-live="polite" className="text-sm text-muted-foreground">
                Watch the sequence.
              </p>
            )}

            {phase === "responding" && (
              <p aria-live="polite" className="text-sm text-foreground">
                Your turn — {taps.length} of {sequence.length} tapped.
              </p>
            )}

            {phase === "feedback" && (
              <p aria-live="polite" className="text-sm">
                {lastCorrect ? (
                  <span className="text-success">Correct.</span>
                ) : (
                  <span className="text-muted-foreground">
                    Not that one. Expected {expected.join(" → ")}.
                  </span>
                )}
              </p>
            )}

            <CorsiBoard
              litBlock={litBlock}
              taps={taps}
              interactive={phase === "responding"}
              onTap={tapBlock}
            />
          </Stack>
        </CardContent>
      </Card>

      <CompletionOverlay
        open={celebrating}
        taskLabel={`Corsi ${condition}`}
        metricLabel="Total Score"
        metricValue={score.totalScore}
        onDismiss={() => setCelebrating(false)}
      />

      {phase === "done" && (
        <Card>
          <CardHeader>
            <CardTitle>Session complete</CardTitle>
          </CardHeader>
          <CardContent>
            <Stack gap={16}>
              <dl className="grid grid-cols-3 gap-4">
                <Metric label="Block Span" value={score.blockSpan} />
                <Metric label="Correct sequences" value={score.correctSequences} />
                <Metric label="Total Score" value={score.totalScore} />
              </dl>
              <TimingWarning interrupted={interrupted} />
              <p className="text-xs text-muted-foreground">
                Total Score is Block Span × correct sequences — it moves on small
                changes that Block Span alone rounds away.
              </p>
              {saving ? (
                <p className="text-sm text-muted-foreground">Saving…</p>
              ) : (
                <SaveNotice result={result} />
              )}
              <Inline gap={8}>
                <Button asChild size="lg" className="min-h-12 px-6">
                  <Link href="/exec-function-assessment">See your history</Link>
                </Button>
              </Inline>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold text-foreground">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

interface BoardProps {
  litBlock: number | null;
  taps: number[];
  interactive: boolean;
  onTap: (blockId: number) => void;
}

/**
 * The nine blocks, positioned by percentage inside a fixed-ratio box so the
 * irregular arrangement survives every screen width. Blocks are buttons, so
 * the task is keyboard-operable as well as tappable.
 */
function CorsiBoard({ litBlock, taps, interactive, onTap }: BoardProps) {
  return (
    <div
      className="relative w-full rounded-lg border border-border bg-background"
      style={{ aspectRatio: "4 / 3" }}
    >
      {CORSI_BLOCKS.map((block) => {
        const isLit = litBlock === block.id;
        const tapOrder = taps.indexOf(block.id);
        return (
          <button
            key={block.id}
            type="button"
            disabled={!interactive}
            onClick={() => onTap(block.id)}
            aria-label={`Block ${block.id}`}
            className={[
              "absolute flex items-center justify-center rounded-md border transition-colors duration-100",
              "h-[13%] w-[10%] -translate-x-1/2 -translate-y-1/2",
              // Lifted off the board rather than sharing its surface: the nine
              // blocks have to be unambiguously visible before the task can
              // measure anything about the sequence.
              isLit
                ? "border-primary bg-primary"
                : "border-foreground/25 bg-foreground/10",
              interactive
                ? "cursor-pointer hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                : "cursor-default",
              tapOrder >= 0 ? "border-foreground bg-foreground/25" : "",
            ].join(" ")}
            style={{ left: `${block.x * 100}%`, top: `${block.y * 100}%` }}
          >
            {tapOrder >= 0 && (
              <span className="text-xs font-medium text-foreground">{tapOrder + 1}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
