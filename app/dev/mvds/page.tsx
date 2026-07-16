import { notFound } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Section,
  Stack,
} from "@beckharrisdesign/mvds";

/**
 * Dev-only MVDS proof route (openspec/changes/hub-tailwind-v4, spec scenario
 * "MVDS components render on the dev route"). The hub pins `.dark` on <html>
 * (app/layout.tsx) — it is a dark-only app — so MVDS renders in its dark mode
 * everywhere in the hub; light mode is unreachable by design. Not part of the
 * hub's information architecture — returns 404 in production.
 */
export default function MvdsProofPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main>
      <Section bg="background" py={64}>
        <Stack gap={24}>
          <h2 className="font-heading text-2xl">
            MVDS proof — hub context (dark; the hub pins .dark at the root)
          </h2>
          <Stack gap={16}>
            <div>
              <Button>Primary action</Button> <Button variant="outline">Outline</Button>{" "}
              <Button variant="ghost">Ghost</Button>
            </div>
            <div>
              <Badge>Default</Badge> <Badge variant="success">Success</Badge>{" "}
              <Badge variant="destructive">Destructive</Badge>{" "}
              <Badge variant="muted">Muted</Badge>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Card title</CardTitle>
                <CardDescription>
                  Rendered by @beckharrisdesign/mvds on the hub&apos;s Tailwind v4 build.
                </CardDescription>
              </CardHeader>
              <CardContent>Card content proves tokens, radius, and type ramp.</CardContent>
            </Card>
          </Stack>
        </Stack>
      </Section>
    </main>
  );
}
