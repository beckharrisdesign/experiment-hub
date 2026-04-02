import { describe, expect, it } from "vitest";
import {
  buildHubSiteMapRoutes,
  getScreenshotPath,
} from "../../scripts/site-map/routes.js";

const experiments = [
  {
    id: "best-day-ever",
    name: "Best Day Ever",
    statement: "Plan online. Work on paper.",
    directory: "experiments/best-day-ever",
    documentationId: "doc-best-day-ever",
    prototypeId: "",
    status: "Active",
    createdDate: "2024-11-01",
    lastModified: "2024-12-16",
    tags: ["planner"],
    validation: {
      status: "live",
      landingDir: "landing",
      devPort: 3002,
    },
  },
  {
    id: "experience-principles-repository",
    name: "Experience Principles Repository",
    statement: "Hidden on home page, still routable.",
    directory: "experiments/experience-principles-repository",
    documentationId: "doc-epr",
    prototypeId: "",
    status: "Abandoned",
    createdDate: "2024-11-01",
    lastModified: "2024-12-16",
    tags: ["design"],
  },
];

describe("buildHubSiteMapRoutes", () => {
  it("includes static hub routes first", () => {
    const routes = buildHubSiteMapRoutes({
      experiments,
      rootDir: "/tmp/does-not-exist",
    });
    expect(routes.slice(0, 5).map((route) => route.path)).toEqual([
      "/",
      "/workflow",
      "/scoring",
      "/heuristics",
      "/harness",
    ]);
  });

  it("creates experiment detail routes for every experiment", () => {
    const routes = buildHubSiteMapRoutes({
      experiments,
      rootDir: "/tmp/does-not-exist",
    });
    expect(routes.map((route) => route.path)).toContain(
      "/experiments/best-day-ever",
    );
    expect(routes.map((route) => route.path)).toContain(
      "/experiments/experience-principles-repository",
    );
  });

  it("omits optional routes when requested", () => {
    const routes = buildHubSiteMapRoutes({
      experiments,
      rootDir: "/tmp/does-not-exist",
      includeOptionalRoutes: false,
    });

    expect(routes.map((route) => route.path)).not.toContain("/prototypes");
  });

  it("returns stable screenshot paths per route", () => {
    expect(getScreenshotPath("/")).toBe("screenshots/home.png");
    expect(getScreenshotPath("/workflow")).toBe("screenshots/workflow.png");
    expect(getScreenshotPath("/experiments/best-day-ever")).toBe(
      "screenshots/experiments--best-day-ever.png",
    );
    expect(getScreenshotPath("/landing/best-day-ever/")).toBe(
      "screenshots/landing--best-day-ever.png",
    );
  });
});
