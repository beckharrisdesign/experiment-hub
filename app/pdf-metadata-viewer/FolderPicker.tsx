"use client";

import { useCallback, useState } from "react";
import { Button, Stack } from "@beckharrisdesign/mvds";

/**
 * Google Picker, folder granularity.
 *
 * Per-file selection is deliberately unavailable (design.md D9, unchanged by
 * D9a): it cannot keep pace with a scanning workflow.
 *
 * Under full `drive` the Picker is no longer the only way to reach existing
 * files — the scope already permits listing them. It stays because choosing a
 * folder is a job the user has to do somehow, and Google's own chooser beats
 * asking for a folder id.
 */

declare global {
  interface Window {
    gapi?: {
      load: (api: string, cb: () => void) => void;
    };
    google?: {
      picker: Record<string, any>;
    };
  }
}

const PICKER_SCRIPT = "https://apis.google.com/js/api.js";

function loadPickerApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.picker) return resolve();

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PICKER_SCRIPT}"]`,
    );

    const onReady = () => {
      if (!window.gapi) return reject(new Error("gapi failed to load"));
      window.gapi.load("picker", () => resolve());
    };

    if (existing) {
      existing.addEventListener("load", onReady, { once: true });
      if (window.gapi) onReady();
      return;
    }

    const script = document.createElement("script");
    script.src = PICKER_SCRIPT;
    script.async = true;
    script.onload = onReady;
    script.onerror = () =>
      reject(new Error("Could not load the Google Picker script"));
    document.head.appendChild(script);
  });
}

type Status =
  | { kind: "idle" }
  | { kind: "opening" }
  | { kind: "importing" }
  | { kind: "done"; imported: number; total: number }
  | { kind: "error"; message: string };

export default function FolderPicker() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const pick = useCallback(async () => {
    setStatus({ kind: "opening" });

    try {
      // Token fetched at the moment of use, not embedded in the page.
      const res = await fetch("/api/pdf-drive/picker-token");
      if (res.status === 409) {
        setStatus({
          kind: "error",
          message: "Drive access needs re-authorizing. Sign in again.",
        });
        return;
      }
      if (!res.ok) throw new Error("Could not get a Drive token");
      const { accessToken, appId, apiKey } = (await res.json()) as {
        accessToken: string;
        appId: string | null;
        apiKey: string | null;
      };

      await loadPickerApi();
      const picker = window.google!.picker;

      const view = new picker.DocsView(picker.ViewId.FOLDERS)
        .setSelectFolderEnabled(true)
        .setIncludeFolders(true)
        .setMimeTypes("application/vnd.google-apps.folder");

      const builder = new picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .addView(view)
        .setTitle("Choose the folder your scans live in")
        .setCallback(async (data: any) => {
          if (data.action !== picker.Action.PICKED) {
            if (data.action === picker.Action.CANCEL) setStatus({ kind: "idle" });
            return;
          }

          const folderId = data.docs?.[0]?.id;
          if (!folderId) {
            setStatus({ kind: "error", message: "No folder was returned." });
            return;
          }

          setStatus({ kind: "importing" });
          const importRes = await fetch("/api/pdf-drive/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId }),
          });

          if (!importRes.ok) {
            const detail = await importRes.json().catch(() => ({}));
            setStatus({
              kind: "error",
              message: detail?.error ?? "Import failed.",
            });
            return;
          }

          const { imported, total } = (await importRes.json()) as {
            imported: number;
            skipped: number;
            total: number;
          };
          setStatus({ kind: "done", imported, total });
          // Server components hold the document list, so a reload is what shows it.
          window.location.reload();
        });

      // Both still matter, for narrower reasons than before. appId used to be
      // what let a drive.file grant attach to the picked folder; under full
      // drive the scope already covers it, and appId now just identifies the
      // app to the Picker. The developer key is what Google's docs require to
      // load the picker, and its absence shows up as a bare 403 rather than
      // anything that names the cause.
      if (appId) builder.setAppId(appId);
      if (apiKey) builder.setDeveloperKey(apiKey);
      builder.build().setVisible(true);
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Something went wrong",
      });
    }
  }, []);

  const busy = status.kind === "opening" || status.kind === "importing";

  return (
    <Stack gap={8}>
      <div>
        <Button onClick={pick} disabled={busy}>
          {status.kind === "importing" ? "Importing…" : "Choose a folder"}
        </Button>
      </div>

      {status.kind === "error" ? (
        <span className="text-sm text-error">{status.message}</span>
      ) : null}

      {status.kind === "done" ? (
        <span className="text-sm text-text-muted">
          Imported {status.imported} of {status.total} PDFs.
        </span>
      ) : null}
    </Stack>
  );
}
