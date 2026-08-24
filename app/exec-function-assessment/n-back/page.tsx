import Link from "next/link";
import { Container, Section, Stack } from "@beckharrisdesign/mvds";
import NBackTask from "./NBackTask";

export const metadata = { title: "Adaptive n-back — Assessment Suite" };

export default function NBackPage() {
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
          <NBackTask />
        </Stack>
      </Container>
    </Section>
  );
}
