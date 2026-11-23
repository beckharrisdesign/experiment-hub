import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { AppBar } from "@/app/pdf-metadata-viewer/AppBar";

describe("AppBar", () => {
  // Edits save as they are made, so leaving any view for the dashboard loses
  // nothing: the way back is always there, in every view and state.
  it("links the app name back to the dashboard", () => {
    render(<AppBar drive={{ connected: true, email: "me@example.com" }} />);
    const home = screen.getByRole("link", { name: "PDF Metadata Viewer" });
    expect(home.getAttribute("href")).toBe("/pdf-metadata-viewer");
  });

  it("shows which account Drive is connected as", () => {
    render(<AppBar drive={{ connected: true, email: "me@example.com" }} />);
    expect(screen.getByText("Drive connected · me@example.com")).toBeTruthy();
  });

  it("says so when Drive is not connected", () => {
    render(<AppBar drive={{ connected: false, email: null }} />);
    expect(screen.getByText("Drive not connected")).toBeTruthy();
  });

  // The sign-in page is public; whose Drive this is stays off it.
  it("shows no account at all when signed out", () => {
    render(<AppBar drive={null} />);
    expect(screen.getByRole("link", { name: "PDF Metadata Viewer" })).toBeTruthy();
    expect(screen.queryByText(/Drive/)).toBeNull();
  });

  it("is not a heading, so each view keeps its own h1", () => {
    render(<AppBar drive={{ connected: false, email: null }} />);
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
