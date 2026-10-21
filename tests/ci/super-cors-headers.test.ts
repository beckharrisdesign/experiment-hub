import { describe, it, expect } from 'vitest';
const nextConfig = require('../../next.config.js');

/**
 * public/super/components.js is an ES module loaded by beckharrisdesign.com
 * from labs.beckharrisdesign.com. Module scripts, dynamic import() and fetch()
 * are all CORS requests, so the /super/* files must carry
 * Access-Control-Allow-Origin or the browser blocks the loader before it runs.
 * The classic <script> and <link> installs never needed it, which is exactly
 * why a missing header here would go unnoticed until the module one shipped.
 */
describe('next.config headers for /super/*', () => {
  it('allows cross-origin reads of the Super library', async () => {
    const rules = await nextConfig.headers();
    const superRule = rules.find((r: { source: string }) => r.source === '/super/:path*');
    expect(superRule).toBeDefined();
    const acao = superRule.headers.find(
      (h: { key: string }) => h.key.toLowerCase() === 'access-control-allow-origin',
    );
    expect(acao?.value).toBe('*');
  });
});
