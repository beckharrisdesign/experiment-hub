import Link from "next/link";
import { Container, Section, Stack } from "@beckharrisdesign/mvds";
import type { CorsiCondition } from "@/lib/exec-function/corsi";
import CorsiTask from "./CorsiTask";

export const metadata = { title: "Corsi block-tapping — Assessment Suite" };

export default async function CorsiPage({
  searchParams,
}: {
  searchParams: Promise<{ condition?: string }>;
}) {
  const { condition } = await searchParams;
  // Anything other than an explicit "backward" runs the forward condition —
  // the standard default, and the safe reading of a mangled link.
  const mode: CorsiCondition = condition === "backward" ? "backward" : "forward";

  return (
    <Section bg="background">
      <Container size="md">
        <Stack gap={24}>
          <Link
            href="/exec-function-assessment"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            ← Assessment suite
          </Link>
          <CorsiTask condition={mode} />
        </Stack>
      </Container>
    </Section>
  );
}
