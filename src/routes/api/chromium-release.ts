import { createFileRoute } from "@tanstack/react-router";

type CftJson = {
  channels: Record<
    string,
    {
      channel: string;
      version: string;
      revision: string;
      downloads: {
        chrome?: { platform: string; url: string }[];
      };
    }
  >;
};

const CFT_JSON =
  "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json";

export const Route = createFileRoute("/api/chromium-release")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const channel = (url.searchParams.get("channel") || "stable").toLowerCase();
        const platform = (url.searchParams.get("platform") || "win64").toLowerCase();
        const keyMap: Record<string, string> = {
          stable: "Stable",
          beta: "Beta",
          dev: "Dev",
          canary: "Canary",
        };
        const key = keyMap[channel] ?? "Stable";

        try {
          const res = await fetch(CFT_JSON, {
            headers: { accept: "application/json" },
          });
          if (!res.ok) {
            return Response.json(
              { error: `upstream ${res.status}` },
              { status: 502 },
            );
          }
          const data = (await res.json()) as CftJson;
          const ch = data.channels[key];
          if (!ch) {
            return Response.json({ error: `unknown channel ${key}` }, { status: 400 });
          }
          const item = ch.downloads.chrome?.find((d) => d.platform === platform);
          if (!item) {
            return Response.json(
              { error: `no download for ${platform}` },
              { status: 404 },
            );
          }

          // Also resolve latest pure Chromium snapshot for Win_x64 when requested
          let snapshotUrl: string | null = null;
          let snapshotRevision: string | null = null;
          if (platform === "win64") {
            try {
              const snap = await fetch(
                "https://download-chromium.appspot.com/dl/Win_x64?type=snapshots",
                { method: "HEAD", redirect: "follow" },
              );
              snapshotUrl = snap.url;
              snapshotRevision = snap.url.match(/Win_x64\/(\d+)\//)?.[1] ?? null;
            } catch {
              // optional
            }
          }

          return Response.json({
            channel: ch.channel,
            version: ch.version,
            revision: ch.revision,
            platform,
            zipUrl: item.url,
            snapshotUrl,
            snapshotRevision,
            fetchedAt: new Date().toISOString(),
          });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "fetch failed" },
            { status: 502 },
          );
        }
      },
    },
  },
});
