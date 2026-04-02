"use strict";

const fs = require("node:fs");
const path = require("node:path");

const STATIC_ROUTES = Object.freeze([
  {
    id: "route:home",
    path: "/",
    title: "Home",
    group: "Hub",
    pageType: "top-level",
    parentId: null,
    depth: 0,
    optional: false,
    sortIndex: 0,
  },
  {
    id: "route:workflow",
    path: "/workflow",
    title: "Workflow",
    group: "Hub",
    pageType: "top-level",
    parentId: "route:home",
    depth: 1,
    optional: false,
    sortIndex: 10,
  },
  {
    id: "route:scoring",
    path: "/scoring",
    title: "Scoring",
    group: "Hub",
    pageType: "top-level",
    parentId: "route:home",
    depth: 1,
    optional: false,
    sortIndex: 20,
  },
  {
    id: "route:heuristics",
    path: "/heuristics",
    title: "Heuristics",
    group: "Hub",
    pageType: "top-level",
    parentId: "route:home",
    depth: 1,
    optional: false,
    sortIndex: 30,
  },
  {
    id: "route:harness",
    path: "/harness",
    title: "Harness",
    group: "Hub",
    pageType: "top-level",
    parentId: "route:home",
    depth: 1,
    optional: false,
    sortIndex: 40,
  },
  {
    id: "route:documentation",
    path: "/documentation",
    title: "Documentation",
    group: "Hub",
    pageType: "top-level",
    parentId: "route:home",
    depth: 1,
    optional: false,
    sortIndex: 50,
  },
  {
    id: "route:font-preview",
    path: "/font-preview",
    title: "Font Preview",
    group: "Hub",
    pageType: "top-level",
    parentId: "route:home",
    depth: 1,
    optional: false,
    sortIndex: 60,
  },
  {
    id: "route:prototypes",
    path: "/prototypes",
    title: "Prototypes",
    group: "Hub",
    pageType: "top-level",
    parentId: "route:home",
    depth: 1,
    optional: true,
    sortIndex: 70,
  },
]);

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function humanizeSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toPosixPath(value) {
  return String(value).split(path.sep).join(path.posix.sep);
}

function normalizeRoutePath(routePath) {
  const [withoutHash] = String(routePath).split("#");
  const [withoutQuery] = withoutHash.split("?");
  const normalized = withoutQuery.replace(/\/+/g, "/");

  if (!normalized || normalized === "/") {
    return "/";
  }

  const withLeadingSlash = normalized.startsWith("/")
    ? normalized
    : `/${normalized}`;

  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

function getScreenshotFileName(routePath) {
  const normalized = normalizeRoutePath(routePath);

  if (normalized === "/") {
    return "home.png";
  }

  return `${normalized.slice(1).split("/").join("--")}.png`;
}

function getScreenshotRelativePath(routePath) {
  return path.posix.join("screenshots", getScreenshotFileName(routePath));
}

function getExperimentDirectorySlug(experiment) {
  return path.posix.basename(toPosixPath(experiment.directory));
}

function getLandingDocAbsolutePath(rootDir, experiment) {
  return path.join(
    rootDir,
    experiment.directory,
    "docs",
    "landing-page-content.md",
  );
}

function getLandingRootAbsolutePath(rootDir) {
  return path.join(rootDir, "public", "landing");
}

function getLandingSlugs(rootDir) {
  const landingRoot = getLandingRootAbsolutePath(rootDir);

  if (!fs.existsSync(landingRoot)) {
    return [];
  }

  return fs
    .readdirSync(landingRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) =>
      fs.existsSync(path.join(landingRoot, slug, "index.html")),
    )
    .sort((left, right) => left.localeCompare(right));
}

function loadExperiments(rootDir = process.cwd()) {
  const experimentsPath = path.join(rootDir, "data", "experiments.json");
  return JSON.parse(fs.readFileSync(experimentsPath, "utf8"));
}

function finalizeRoute(route) {
  return {
    ...route,
    thumbnailName: getScreenshotFileName(route.path),
    thumbnailPath: getScreenshotRelativePath(route.path),
  };
}

function buildSiteMapRoutes(options = {}) {
  const {
    experiments = [],
    rootDir = process.cwd(),
    includeOptionalRoutes = true,
  } = options;

  const routes = [];
  const seen = new Set();

  function addRoute(route) {
    if (seen.has(route.id)) {
      return;
    }

    seen.add(route.id);
    routes.push(finalizeRoute(route));
  }

  for (const route of STATIC_ROUTES) {
    if (route.optional && !includeOptionalRoutes) {
      continue;
    }

    addRoute({ ...route, status: null });
  }

  const experimentByLandingSlug = new Map();

  experiments.forEach((experiment, index) => {
    const experimentSlug = slugify(experiment.name);
    const experimentRouteId = `experiment:${experiment.id}`;
    const experimentSortIndex = 100 + index * 10;
    const landingSlug = getExperimentDirectorySlug(experiment);

    experimentByLandingSlug.set(landingSlug, experiment);

    addRoute({
      id: experimentRouteId,
      path: `/experiments/${experimentSlug}`,
      title: experiment.name,
      group: experiment.name,
      pageType: "experiment",
      parentId: "route:home",
      depth: 1,
      experimentId: experiment.id,
      status: experiment.status,
      sortIndex: experimentSortIndex,
    });

    if (fs.existsSync(getLandingDocAbsolutePath(rootDir, experiment))) {
      addRoute({
        id: `experiment-doc:${experiment.id}:landing-page-content`,
        path: `/experiments/${experimentSlug}/doc/landing-page-content`,
        title: `${experiment.name} landing page content`,
        group: experiment.name,
        pageType: "experiment-doc",
        parentId: experimentRouteId,
        depth: 2,
        experimentId: experiment.id,
        status: experiment.status,
        sortIndex: experimentSortIndex + 1,
      });
    }
  });

  getLandingSlugs(rootDir).forEach((landingSlug, index) => {
    const experiment = experimentByLandingSlug.get(landingSlug) || null;
    const experimentRouteId = experiment ? `experiment:${experiment.id}` : null;
    const sortBase = experiment
      ? 100 + experiments.findIndex((item) => item.id === experiment.id) * 10
      : 1000 + index * 10;

    addRoute({
      id: `landing:${landingSlug}`,
      path: `/landing/${landingSlug}/`,
      title: experiment
        ? `${experiment.name} landing page`
        : `${humanizeSlug(landingSlug)} landing page`,
      group: experiment ? experiment.name : "Landing pages",
      pageType: "landing",
      parentId: experimentRouteId || "route:home",
      depth: experiment ? 2 : 1,
      experimentId: experiment ? experiment.id : undefined,
      status: experiment ? experiment.status : null,
      sortIndex: sortBase + (experiment ? 2 : 0),
    });
  });

  return routes.sort((left, right) => {
    if (left.sortIndex !== right.sortIndex) {
      return left.sortIndex - right.sortIndex;
    }

    return left.path.localeCompare(right.path);
  });
}

function getExperimentHubSiteMapRoutes(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const experiments = options.experiments || loadExperiments(rootDir);

  return buildSiteMapRoutes({
    rootDir,
    experiments,
    includeOptionalRoutes: options.includeOptionalRoutes !== false,
  });
}

module.exports = {
  STATIC_ROUTES,
  buildHubSiteMapRoutes: buildSiteMapRoutes,
  buildSiteMapRoutes,
  getExperimentHubSiteMapRoutes,
  getLandingSlugs,
  getScreenshotFileName,
  getScreenshotPath: getScreenshotRelativePath,
  getScreenshotRelativePath,
  loadExperiments,
  normalizeRoutePath,
  slugify,
};
