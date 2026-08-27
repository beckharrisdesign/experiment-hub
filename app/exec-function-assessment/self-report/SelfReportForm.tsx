"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Inline,
  Label,
  RadioGroup,
  RadioGroupItem,
  Stack,
} from "@beckharrisdesign/mvds";
import {
  INDICES,
  ITEMS,
  RESPONSE_OPTIONS,
  SUBSCALES,
  isComplete,
  missingItems,
  score,
  RECALL_WINDOW,
  RECALL_WINDOW_CHIP,
  RECALL_WINDOW_PROMPT,
  type Responses,
  type ResponseValue,
  type SelfReportSession,
  type SubscaleId,
} from "@/lib/exec-function/self-report";
import { useRecorder } from "../components/useRecorder";
import SaveNotice from "../components/SaveNotice";
import CompletionOverlay from "../components/CompletionOverlay";

/**
 * The everyday check-in.
 *
 * Items are presented in subscale order rather than shuffled. Shuffling is the
 * usual defence against response sets, but this is the same person answering
 * every few weeks — they will recognise the items regardless, and grouping them
 * makes the questionnaire quicker, which matters more for something meant to be
 * done repeatedly.
 */
export default function SelfReportForm() {
  const [responses, setResponses] = useState<Responses>({});
  const [submitted, setSubmitted] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const { record, result, saving } = useRecorder();

  const remaining = missingItems(responses).length;
  const complete = isComplete(responses);

  const scores = useMemo(() => (complete ? score(responses) : null), [complete, responses]);

  const answer = (itemId: string, value: ResponseValue) =>
    setResponses((prev) => ({ ...prev, [itemId]: value }));

  const submit = async () => {
    if (!scores) return;
    setSubmitted(true);
    const durationMs = Date.now() - startedAt;
    const session: SelfReportSession = {
      id: "",
      timestamp: new Date().toISOString(),
      durationMs,
      responses: responses as Record<string, ResponseValue>,
      scores,
      recallWindow: RECALL_WINDOW,
    };

    await record({
      module: "self-report",
      variant: null,
      durationMs,
      headline: scores.composite.raw,
      detail: session,
    });
    setCelebrating(true);
  };

  if (submitted && scores) {
    return (
      <>
      <CompletionOverlay
        open={celebrating}
        taskLabel="The everyday check-in"
        metricLabel="Composite"
        metricValue={scores.composite.raw}
        onDismiss={() => setCelebrating(false)}
      />
      <Card>
        <CardHeader>
          <CardTitle>Check-in complete</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack gap={24}>
            <div>
              <p className="text-xs text-muted-foreground">Composite (45–135)</p>
              <p className="text-4xl font-semibold text-foreground">{scores.composite.raw}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Higher means more everyday difficulty reported.
              </p>
            </div>

            <table className="w-full text-left text-sm">
              <caption className="sr-only">Subscale and index scores</caption>
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th scope="col" className="py-1 font-medium">Scale</th>
                  <th scope="col" className="py-1 font-medium">Raw</th>
                  <th scope="col" className="py-1 font-medium">Range</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(INDICES) as (keyof typeof INDICES)[]).map((indexId) => (
                  <Fragment key={indexId}>
                    <tr className="border-t border-border">
                      <th scope="row" className="py-1 font-medium text-foreground">
                        {INDICES[indexId].label}
                      </th>
                      <td className="py-1 font-medium text-foreground">
                        {scores.indices[indexId].raw}
                      </td>
                      <td className="py-1 text-muted-foreground">
                        {scores.indices[indexId].min}–{scores.indices[indexId].max}
                      </td>
                    </tr>
                    {INDICES[indexId].subscales.map((subscaleId) => (
                      <tr key={subscaleId} className="border-t border-border/50">
                        <th scope="row" className="py-1 pl-4 font-normal text-muted-foreground">
                          {SUBSCALES[subscaleId].label}
                        </th>
                        <td className="py-1 text-muted-foreground">
                          {scores.subscales[subscaleId].raw}
                        </td>
                        <td className="py-1 text-muted-foreground">
                          {scores.subscales[subscaleId].min}–{scores.subscales[subscaleId].max}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>

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
      </>
    );
  }

  return (
    <Stack gap={24}>
      {/*
        Stated here, and again in every card header below. Forty-five items
        across nine cards scrolls this line away long before the last answer,
        and the whole reason for a short window is that recall over a long one
        is unreliable — a window you have to remember would reintroduce the
        problem it exists to solve.
      */}
      <p className="text-base text-foreground">{RECALL_WINDOW_PROMPT}</p>

      {(Object.keys(SUBSCALES) as SubscaleId[]).map((subscaleId) => {
        const subscale = SUBSCALES[subscaleId];
        const items = ITEMS.filter((item) => item.subscale === subscaleId);

        return (
          <Card key={subscaleId}>
            <CardHeader>
              <Inline gap={8} align="center" justify="between">
                <CardTitle>{subscale.label}</CardTitle>
                <Inline gap={8} align="center">
                  <Badge variant="muted">{INDICES[subscale.index].label}</Badge>
                  <Badge variant="outline">{RECALL_WINDOW_CHIP}</Badge>
                </Inline>
              </Inline>
              <p className="mt-1 text-sm text-muted-foreground">{subscale.blurb}</p>
            </CardHeader>
            <CardContent>
              <Stack gap={24}>
                {items.map((item) => (
                  <fieldset key={item.id}>
                    <legend className="mb-2 text-sm text-foreground">{item.text}</legend>
                    <RadioGroup
                      value={responses[item.id] ? String(responses[item.id]) : undefined}
                      onValueChange={(value) => answer(item.id, Number(value) as ResponseValue)}
                      className="grid grid-cols-3 gap-2"
                    >
                      {RESPONSE_OPTIONS.map((option) => {
                        const selected = responses[item.id] === option.value;
                        return (
                          // The whole cell is the target, not the 16px dot. 48px
                          // tall so it clears the minimum thumb size, and the
                          // label sits inside it rather than beside it.
                          <Label
                            key={option.value}
                            htmlFor={`${item.id}-${option.value}`}
                            className={[
                              "flex min-h-12 cursor-pointer items-center justify-center gap-2",
                              "rounded-md border px-3 py-3 text-sm transition-colors",
                              selected
                                ? "border-foreground/40 bg-foreground/10 text-foreground"
                                : "border-border hover:border-foreground/30",
                            ].join(" ")}
                          >
                            <RadioGroupItem
                              id={`${item.id}-${option.value}`}
                              value={String(option.value)}
                            />
                            {option.label}
                          </Label>
                        );
                      })}
                    </RadioGroup>
                  </fieldset>
                ))}
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardContent>
          <Stack gap={16}>
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {complete
                ? "All 45 items answered."
                : `${remaining} item${remaining === 1 ? "" : "s"} still unanswered.`}
            </p>
            <Inline gap={8}>
              <Button
                onClick={submit}
                disabled={!complete}
                size="lg"
                className="min-h-12 w-full px-8 sm:w-auto"
              >
                Score and save
              </Button>
            </Inline>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
