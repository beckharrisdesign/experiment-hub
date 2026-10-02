/**
 * The canonical views of beckharrisdesign.com.
 *
 * One shared list so the extractor, the frame generator and the drift check
 * cannot disagree about what "canonical" means (tasks 3.2).
 *
 * `tier` is the sitemap decision recorded in design.md: navigation is
 * authoritative, containment is a second attribute. Where they disagree,
 * `parentPageClass` records what the markup claims so the disagreement stays
 * visible instead of being quietly reconciled.
 */

export const SITE = 'https://beckharrisdesign.com';

/** Fixed baseline width. Breakpoint variants come from the three the CSS defines. */
export const BASELINE_VIEWPORT = { width: 1347, height: 1000 };

/** The breakpoints the stylesheet actually defines — not invented ones. */
export const BREAKPOINTS = [
  { width: 1000, why: '§9 card row wraps to 2-up' },
  { width: 640, why: '§9 card row goes single column' },
  { width: 600, why: '§3 navbar button shrinks' },
];

export const VIEWS = [
  {
    id: 'home',
    label: 'Home',
    route: '/',
    tier: 'tree',
    depth: 0,
    parent: null,
    parentPageClass: null, // page__index, no parent-page__*
    why: '§4 hides the header; #page-index spacer rule',
  },
  {
    id: 'projects',
    label: 'Projects (gallery)',
    route: '/all-projects',
    tier: 'tree',
    depth: 1,
    parent: 'home',
    parentPageClass: 'parent-page__index',
    why: '§6 card grid, §4 hidden header',
  },
  {
    id: 'consultation',
    label: 'Consultation',
    route: '/bhd-consultation',
    tier: 'tree',
    depth: 1,
    parent: 'home',
    parentPageClass: 'parent-page__index',
    why: '§5 accent-coloured H2 section labels',
  },
  {
    id: 'about',
    label: 'About',
    route: '/katy-harris',
    tier: 'tree',
    depth: 1,
    parent: 'home',
    parentPageClass: 'parent-page__index',
    why: '§7 properties at length',
  },
  {
    id: 'essay',
    label: 'Essay / talk',
    route: '/emotional-design-in-the-age-of-ai',
    tier: 'tree',
    depth: 1,
    parent: 'home',
    parentPageClass: 'parent-page__index',
    why: '§4 body measure with no collection',
  },
  {
    id: 'labs',
    label: 'Labs index',
    route: '/bhd-labs',
    tier: 'tree',
    depth: 1,
    parent: 'home',
    parentPageClass: 'parent-page__index',
    why: '§6 top-cropped covers + §8 borderless tables',
  },
  {
    id: 'project-detail',
    label: 'Project detail',
    route: '/connected-china',
    tier: 'tree',
    depth: 2,
    parent: 'projects',
    parentPageClass: 'parent-page__index',
    // markup says child of home; navigation says reached through Projects
    divergesFromMarkup: true,
    why: '§5 .parent-page__index full-bleed callouts',
  },
  {
    id: 'labs-detail',
    label: 'Labs detail',
    route: '/bhd-labs/mvds',
    tier: 'tree',
    depth: 2,
    parent: 'labs',
    parentPageClass: 'parent-page__bhd-labs',
    why: '§4 .parent-page__bhd-labs header treatment',
  },
  {
    id: 'curated',
    label: 'Curated collection',
    route: '/for-babylist',
    tier: 'unlisted',
    parent: null,
    parentPageClass: 'parent-page__index',
    divergesFromMarkup: true,
    instances: ['/for-babylist', '/for-customerio'],
    unlistedBecause:
      '§9 hides title, cover, properties and breadcrumbs — "handed out as a direct link, not browsed to". Deliberate.',
    why: '§9 in full — the only view with the card row',
  },
  {
    id: 'database',
    label: 'Raw database',
    route: '/bhd-database',
    tier: 'unlisted',
    parent: null,
    parentPageClass: 'parent-page__index',
    instances: ['/bhd-database', '/bhd-labs-database', '/bhd-labs-history'],
    unlistedBecause:
      "Hidden by Super's own setting — .notion-page { display: var(--page-display) } resolves to none. The anchor and its text remain in the homepage HTML at 0x0, all three routes are in sitemap.xml, and each returns 200. Unlisted, not private.",
    why: '§7 page properties incl. .notion-property__url',
  },
];

/** Advertised in sitemap.xml but returning 404. Recorded, not drawn. */
export const DEAD_ROUTES = [
  { route: '/what-i-believe', note: 'advertised in sitemap.xml' },
  { route: '/design-leadership', note: 'advertised in sitemap.xml' },
  { route: '/site-unavailable', note: 'Super system page; expected' },
];

export const byId = (id) => VIEWS.find((v) => v.id === id);
export const treeViews = () => VIEWS.filter((v) => v.tier === 'tree');
export const unlistedViews = () => VIEWS.filter((v) => v.tier === 'unlisted');
