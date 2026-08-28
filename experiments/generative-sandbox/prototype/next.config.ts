import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // sharp is a native module — keep it external so Next does not try to bundle it
  // into the serverless function.
  serverExternalPackages: ['sharp'],
  // The hub root has a pnpm lockfile and this prototype has an npm one, so Next
  // otherwise infers a workspace root far above the repo and warns on every build.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
