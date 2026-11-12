// Deliberately empty. Without this file, PostCSS searches up the folders and loads the HUB's
// postcss.config.js (Tailwind), which this standalone project does not install. That broke
// the build in CI (PR #591), while it passed locally only because the hub's node_modules existed.
export default { plugins: {} };
