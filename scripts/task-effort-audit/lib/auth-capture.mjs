/*
 * Save a signed-in session for a property's storageState auth profile.
 *
 * Opens a real browser window at the property, waits while the person signs in
 * themselves (the runner never types credentials), and saves the resulting
 * cookies with Playwright's storageState to a gitignored file. Nothing about
 * the session is printed. Sessions expire on the site's own schedule (the PDF
 * Organizer's lasts 8 hours), after which runs stop as authentication failures
 * and this needs re-running.
 */
import { execFileSync } from 'node:child_process';
import { chmod, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { AuthError, ConfigError } from './util.mjs';
import { locate } from './runner.mjs';

export function defaultAuthPath(dataDir, propertyId, profileName) {
  return path.join(dataDir, 'auth', `${propertyId}--${profileName}.json`);
}

/** True when git would ignore the file (or there's no git to ask). */
export function isGitIgnored(file) {
  try {
    execFileSync('git', ['check-ignore', '-q', file], { stdio: 'ignore' });
    return true;
  } catch (e) {
    // Exit 1 = not ignored; anything else (no git, not a repo) can't be checked.
    return e.status !== 1;
  }
}

/** Signed in = off the login URL and, when the profile names one, the signed-in check is visible. */
export function looksSignedOut(url, profile) {
  return Boolean(profile.loginUrlPattern && new RegExp(profile.loginUrlPattern).test(url));
}

async function launch({ headless, channel, log }) {
  const opts = {
    headless,
    // Google refuses sign-in in browsers that announce automation.
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  };
  if (channel) {
    try {
      return await chromium.launch({ ...opts, channel });
    } catch {
      log(`(${channel} not found; using Playwright's Chromium. If Google blocks the sign-in, install Chrome and retry.)`);
    }
  }
  return chromium.launch({ ...opts, executablePath: process.env.TEA_CHROMIUM_PATH || undefined });
}

/**
 * @param {{ property: any, profileName: string, dataDir: string, start?: string, out?: string,
 *   headless?: boolean, channel?: string | null, timeoutMs?: number, log?: (s: string) => void }} p
 */
export async function captureSession({ property, profileName, dataDir, start = '/', out, headless = false, channel = 'chrome', timeoutMs = 5 * 60_000, log = console.log }) {
  const profile = property.authProfiles[profileName];
  if (!profile) throw new ConfigError(`property "${property.id}" has no auth profile "${profileName}"`);
  if (profile.type !== 'storageState') throw new ConfigError(`auth profile "${profileName}" is type "${profile.type}"; only storageState profiles are captured`);

  const file = path.resolve(out ?? defaultAuthPath(dataDir, property.id, profileName));
  await mkdir(path.dirname(file), { recursive: true });
  if (!isGitIgnored(file)) {
    throw new ConfigError(`${file} is not gitignored. A saved session must never be committable; write it under artifacts/task-effort-audit/auth/`);
  }

  const browser = await launch({ headless, channel, log });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(new URL(start, property.baseUrl).href);
    log(`Sign in to ${property.name} in the browser window. Waiting up to ${Math.round(timeoutMs / 60000)} min…`);

    const deadline = Date.now() + timeoutMs;
    const { signedInCheck } = profile;
    for (;;) {
      if (Date.now() > deadline) throw new AuthError(`no signed-in page within ${Math.round(timeoutMs / 1000)} s; nothing was saved`);
      const onLogin = looksSignedOut(page.url(), profile);
      const checkOk = !signedInCheck ? true : await locate(page, signedInCheck).first().isVisible().catch(() => false);
      if (!onLogin && checkOk) break;
      await page.waitForTimeout(1000);
    }

    await context.storageState({ path: file });
    await chmod(file, 0o600);
    log(`Saved the session (not shown) to ${path.relative(process.cwd(), file)}`);
    log('Before running tasks, set:');
    log(`  export ${profile.pathEnv}="${file}"`);
    return file;
  } finally {
    await browser.close();
  }
}
