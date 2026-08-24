import Link from "next/link";
import { Container, Section, Stack } from "@beckharrisdesign/mvds";
import SelfReportForm from "./SelfReportForm";

export const metadata = { title: "Everyday check-in — Assessment Suite" };

export default function SelfReportPage() {
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
          <h1 className="text-2xl font-semibold text-foreground">Everyday check-in</h1>
          <SelfReportForm />
        </Stack>
      </Container>
    </Section>
  );
}
