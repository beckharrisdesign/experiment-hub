import { redirect } from 'next/navigation';

/**
 * Gate: packet-extraction-test is a dev/debug page.
 * In production, redirect to home.
 */
export default function PacketExtractionTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === 'production') {
    redirect('/');
  }
  return <>{children}</>;
}
