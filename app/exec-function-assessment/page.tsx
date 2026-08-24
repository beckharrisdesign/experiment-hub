import { Container, Section, Stack } from "@beckharrisdesign/mvds";
import HistoryDashboard from "./HistoryDashboard";

export const metadata = {
  title: "Executive Function Assessment Suite",
  description:
    "Standard-protocol Corsi, adaptive n-back, and an everyday check-in, tracked over time.",
};

export default function AssessmentSuitePage() {
  return (
    <Section bg="background">
      <Container size="lg">
        <Stack gap={32}>
          <Stack gap={8}>
            <h1 className="text-3xl font-semibold text-foreground">
              Executive Function Assessment Suite
            </h1>
            <p className="max-w-prose text-muted-foreground">
              Three standard protocols, digitized faithfully and scored
              automatically: the Corsi block-tapping task, an adaptive
              visuospatial n-back, and a self-report check-in. One arrives by
              email each morning; results accumulate here.
            </p>
          </Stack>

          <HistoryDashboard />
        </Stack>
      </Container>
    </Section>
  );
}
