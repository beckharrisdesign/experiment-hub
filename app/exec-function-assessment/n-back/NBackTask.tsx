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
  Field,
  Inline,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
} from "@beckharrisdesign/mvds";
import {
  DECREASE_THRESHOLDS,
  DEFAULT_BLOCKS,
  DEFAULT_DECREASE_THRESHOLD,
  DEFAULT_STARTING_N,
  GRID_CELLS,
  STIMULUS_MS,
  TRIAL_MS,
  accuracyByLevel,
  generateBlock,
  nextN,
  scoreBlock,
  type NBackBlockPlan,
  type NBackBlockResult,
  type NBackSession,
} from "@/lib/exec-function/nback";
import { useRecorder } from "../components/useRecorder";
import SaveNotice from "../components/SaveNotice";
import TimingWarning from "../components/TimingWarning";
import { useVisibilityGuard } from "../components/useVisibilityGuard";

/**
 * Adaptive visuospatial n-back.
 *
 * One response per trial, registered any time within the 3-second window —
 * pressing again does not toggle it off. A trial where the participant never
 * responds is a considered "no", not a missing value, which is what makes
 * correct rejections countable.
 */

type Phase = "ready" | "running" | "between" | "done";

const PERCENT = (value: number) => `${Math.round(value * 100)}%`;

export default function NBackTask() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [startingN, setStartingN] = useState(DEFAULT_STARTING_N);
  const [decreaseThreshold, setDecreaseThreshold] = useState<number>(DEFAULT_DECREASE_THRESHOLD);

  const [plan, setPlan] = useState<NBackBlockPlan | null>(null);
  const [trialIndex, setTrialIndex] = useState(-1);
  const [visible, setVisible] = useState(false);
  const [responded, setResponded] = useState(false);
  const [results, setResults] = useState<NBackBlockResult[]>([]);
  const [pendingN, setPendingN] = useState(DEFAULT_STARTING_N);
  const [startedAt, setStartedAt] = useState(0);

  // Responses are read by the scorer the instant a block ends, so they live in
  // a ref — state would still be a render behind at that moment.
  const responses = useRef<boolean[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { record, result, saving } = useRecorder();
  const { interrupted } = useVisibilityGuard(phase === "running");

  // Read at save time so the flag covers every block, not just the last render.
  const interruptedRef = useRef(false);
  useEffect(() => {
    interruptedRef.current = interrupted;
  }, [interrupted]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const finishSession = useCallback(
    async (blocks: NBackBlockResult[], elapsedMs: number) => {
      const meanAccuracy =
        blocks.reduce((sum, b) => sum + b.accuracy, 0) / Math.max(1, blocks.length);
      const last = blocks[blocks.length - 1];
      const endingN = last ? nextN(last.n, last.accuracy, decreaseThreshold) : startingN;
      const peakN = blocks.reduce((max, b) => Math.max(max, b.n), startingN);

      const session: NBackSession = {
        id: "",
        timestamp: new Date().toISOString(),
        startingN,
        endingN,
        peakN,
        meanAccuracy,
        decreaseThreshold,
        durationMs: elapsedMs,
        blocks,
        accuracyByLevel: accuracyByLevel(blocks),
        timingReliable: !interruptedRef.current,
      };

      await record({
        module: "n-back",
        variant: null,
        durationMs: elapsedMs,
        headline: peakN,
        detail: session,
      });
    },
    [decreaseThreshold, record, startingN],
  );

  /**
   * Schedule an entire block up front.
   *
   * Every trial's timers are set from one origin rather than each trial arming
   * the next, so a slow frame delays one stimulus instead of pushing the whole
   * remaining block late — the 3-second rhythm is the protocol, and drift
   * accumulating over twenty-odd trials would quietly change the task.
   */
  const startBlock = useCallback(
    (n: number, blocksSoFar: NBackBlockResult[], began: number) => {
      const blockPlan = generateBlock(n);
      responses.current = new Array(blockPlan.positions.length).fill(false);
      setPlan(blockPlan);
      setPhase("running");

      blockPlan.positions.forEach((_, index) => {
        const onset = index * TRIAL_MS;
        timers.current.push(
          setTimeout(() => {
            setTrialIndex(index);
            setResponded(false);
            setVisible(true);
          }, onset),
        );
        timers.current.push(setTimeout(() => setVisible(false), onset + STIMULUS_MS));
      });

      timers.current.push(
        setTimeout(() => {
          const scored = scoreBlock(blockPlan, responses.current);
          const updated = [...blocksSoFar, scored];
          setResults(updated);
          setTrialIndex(-1);
          setVisible(false);

          if (updated.length >= DEFAULT_BLOCKS) {
            setPhase("done");
            void finishSession(updated, Date.now() - began);
          } else {
            setPendingN(nextN(scored.n, scored.accuracy, decreaseThreshold));
            setPhase("between");
          }
        }, blockPlan.positions.length * TRIAL_MS),
      );
    },
    [decreaseThreshold, finishSession],
  );

  const begin = useCallback(() => {
    clearTimers();
    const began = Date.now();
    setStartedAt(began);
    setResults([]);
    setPendingN(startingN);
    startBlock(startingN, [], began);
  }, [clearTimers, startBlock, startingN]);

  const respond = useCallback(() => {
    if (phase !== "running" || trialIndex < 0) return;
    responses.current[trialIndex] = true;
    setResponded(true);
  }, [phase, trialIndex]);

  // Space is the standard response key; the on-screen button covers touch.
  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        respond();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, respond]);

  const activeCell = visible && plan && trialIndex >= 0 ? plan.positions[trialIndex] : null;
  const currentN = plan?.n ?? startingN;
  const lastResult = results[results.length - 1];

  return (
    <Stack gap={24}>
      <Card>
        <CardHeader>
          <Inline gap={8} align="center" justify="between">
            <CardTitle>Adaptive n-back</CardTitle>
            {phase === "running" && (
              <Badge variant="muted">
                {currentN}-back · block {results.length + 1} of {DEFAULT_BLOCKS}
              </Badge>
            )}
          </Inline>
        </CardHeader>

        <CardContent>
          <Stack gap={16}>
            {phase === "ready" && (
              <Stack gap={16}>
                <p className="text-sm text-muted-foreground">
                  A square lights up every three seconds. Press{" "}
                  <kbd className="rounded border border-border px-1 text-xs">space</kbd>{" "}
                  (or tap Match) whenever the position is the same as it was{" "}
                  <strong className="font-medium text-foreground">N steps back</strong>.
                  N moves up or down between blocks based on how you did.{" "}
                  {DEFAULT_BLOCKS} blocks, about {Math.round((DEFAULT_BLOCKS * 23 * TRIAL_MS) / 60000)} minutes.
                </p>

                <Inline gap={16} wrap>
                  <Field label="Starting N">
                    <Select
                      value={String(startingN)}
                      onValueChange={(value) => setStartingN(Number(value))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}-back
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field
                    label="Drop N at or below"
                    help="Raises N at 85% either way."
                  >
                    <Select
                      value={String(decreaseThreshold)}
                      onValueChange={(value) => setDecreaseThreshold(Number(value))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DECREASE_THRESHOLDS.map((threshold) => (
                          <SelectItem key={threshold} value={String(threshold)}>
                            {PERCENT(threshold)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </Inline>

                <Inline gap={8}>
                  <Button onClick={begin}>Start</Button>
                </Inline>
              </Stack>
            )}

            {phase === "running" && (
              <Stack gap={16} align="center">
                <NBackGrid activeCell={activeCell} />
                <Button
                  size="lg"
                  variant={responded ? "secondary" : "default"}
                  onClick={respond}
                  aria-pressed={responded}
                  className="w-full max-w-xs"
                >
                  {responded ? "Match recorded" : `Match (${currentN} back)`}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Trial {trialIndex + 1} of {plan?.positions.length ?? 0} · space bar works too
                </p>
              </Stack>
            )}

            {phase === "between" && lastResult && (
              <Stack gap={16}>
                <p className="text-sm text-foreground">
                  Block {results.length}: {PERCENT(lastResult.accuracy)} accurate at{" "}
                  {lastResult.n}-back.
                </p>
                <p className="text-sm text-muted-foreground">
                  {pendingN > lastResult.n && `Next block moves up to ${pendingN}-back.`}
                  {pendingN < lastResult.n && `Next block drops to ${pendingN}-back.`}
                  {pendingN === lastResult.n && `Next block stays at ${pendingN}-back.`}
                </p>
                <Inline gap={8}>
                  <Button onClick={() => startBlock(pendingN, results, startedAt)}>
                    Continue
                  </Button>
                </Inline>
              </Stack>
            )}

            {phase === "done" && (
              <Stack gap={16}>
                <TimingWarning interrupted={interrupted} />
                <dl className="grid grid-cols-3 gap-4">
                  <Metric label="Peak N" value={results.reduce((m, b) => Math.max(m, b.n), startingN)} />
                  <Metric label="Started at" value={startingN} />
                  <Metric
                    label="Mean accuracy"
                    value={PERCENT(
                      results.reduce((sum, b) => sum + b.accuracy, 0) / Math.max(1, results.length),
                    )}
                  />
                </dl>

                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Accuracy by block</caption>
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th scope="col" className="py-1 font-medium">Block</th>
                      <th scope="col" className="py-1 font-medium">N</th>
                      <th scope="col" className="py-1 font-medium">Hits</th>
                      <th scope="col" className="py-1 font-medium">False alarms</th>
                      <th scope="col" className="py-1 font-medium">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((block, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1">{i + 1}</td>
                        <td className="py-1">{block.n}</td>
                        <td className="py-1">{block.hits}/{block.hits + block.misses}</td>
                        <td className="py-1">{block.falseAlarms}</td>
                        <td className="py-1">{PERCENT(block.accuracy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {saving ? (
                  <p className="text-sm text-muted-foreground">Saving…</p>
                ) : (
                  <SaveNotice result={result} />
                )}

                <Inline gap={8}>
                  <Button asChild>
                    <Link href="/exec-function-assessment">See your history</Link>
                  </Button>
                  <Button variant="outline" onClick={() => setPhase("ready")}>
                    Run it again
                  </Button>
                </Inline>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold text-foreground">{value}</dd>
    </div>
  );
}

/**
 * The 3x3 field. The centre cell is rendered but never used as a stimulus —
 * leaving it visibly empty keeps the eight positions spatially anchored rather
 * than reading as an irregular ring.
 */
function NBackGrid({ activeCell }: { activeCell: number | null }) {
  const activeGridIndex = activeCell === null ? null : GRID_CELLS[activeCell];

  return (
    <div
      className="grid aspect-square w-full max-w-sm grid-cols-3 gap-2"
      role="img"
      aria-label={activeGridIndex === null ? "No stimulus" : "Stimulus showing"}
    >
      {Array.from({ length: 9 }, (_, cell) => {
        const isCentre = cell === 4;
        const isActive = activeGridIndex === cell;
        return (
          <div
            key={cell}
            className={[
              "rounded-md border transition-colors",
              isCentre ? "border-dashed border-foreground/15" : "border-foreground/25",
              isActive ? "bg-primary" : isCentre ? "bg-transparent" : "bg-foreground/10",
            ].join(" ")}
            style={{ transitionDuration: `${Math.min(120, STIMULUS_MS)}ms` }}
          />
        );
      })}
    </div>
  );
}
