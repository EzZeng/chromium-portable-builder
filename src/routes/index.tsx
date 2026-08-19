import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudOff,
  Cpu,
  Download,
  ExternalLink,
  HardDrive,
  Loader2,
  Package,
  RotateCcw,
  Settings2,
  Shield,
  Terminal,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import { Checklist } from "@/components/checklist";
import { PortableConfigForm } from "@/components/portable-config-form";
import { useProgress } from "@/hooks/use-progress";
import {
  DEFAULT_CONFIG,
  FAQ,
  GUIDE_STEPS,
  REQUIREMENTS,
  SOURCE_DOC,
  generateAllScripts,
  generateGnArgs,
  type PortableConfig,
  type StepId,
} from "@/lib/chromium-data";
import {
  generateManualPortableReadme,
  generateOfflinePortableReadme,
  generatePrebuiltPortableBat,
  zipBasenameFromUrl,
  type InstallMode,
} from "@/lib/portable-prebuilt";
import { cn, downloadTextFile } from "@/lib/utils";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

type TabId = "portable" | "guide" | "scripts" | "faq";
type SourceKind = "cft" | "snapshot";

type ReleaseInfo = {
  channel: string;
  version: string;
  revision: string;
  platform: string;
  zipUrl: string;
  snapshotUrl: string | null;
  snapshotRevision: string | null;
  fetchedAt: string;
};

function Home() {
  const progress = useProgress();
  const [tab, setTab] = useState<TabId>("portable");
  const [cfg, setCfg] = useState<PortableConfig>(DEFAULT_CONFIG);
  const [source, setSource] = useState<SourceKind>("cft");
  const [installMode, setInstallMode] = useState<InstallMode>("online");
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [loadingRelease, setLoadingRelease] = useState(true);

  const scripts = useMemo(() => generateAllScripts(cfg), [cfg]);
  const gnArgs = useMemo(() => generateGnArgs(cfg), [cfg]);

  useEffect(() => {
    let cancelled = false;
    setLoadingRelease(true);
    setReleaseError(null);
    fetch("/api/chromium-release?channel=stable&platform=win64")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        return data as ReleaseInfo;
      })
      .then((data) => {
        if (!cancelled) setRelease(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setReleaseError(e instanceof Error ? e.message : "載入版本失敗");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRelease(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const zipUrl =
    source === "snapshot"
      ? (release?.snapshotUrl ??
        "https://download-chromium.appspot.com/dl/Win_x64?type=snapshots")
      : (release?.zipUrl ??
        "https://storage.googleapis.com/chrome-for-testing-public/151.0.7922.76/win64/chrome-win64.zip");

  const versionLabel =
    source === "snapshot"
      ? `Chromium snapshot Win_x64 r${release?.snapshotRevision ?? "latest"}`
      : `Chrome for Testing ${release?.version ?? "…"} (${release?.channel ?? "Stable"}) win64`;

  const offline = installMode === "offline";
  const expectedZipName = useMemo(() => zipBasenameFromUrl(zipUrl), [zipUrl]);
  const setupBatFilename = offline
    ? "ChromiumPortable-Setup-Offline.bat"
    : "ChromiumPortable-Setup.bat";

  const setupBat = useMemo(
    () =>
      generatePrebuiltPortableBat({
        packageDir: cfg.packageDir,
        zipUrl,
        label: versionLabel,
        mode: installMode,
      }),
    [cfg.packageDir, zipUrl, versionLabel, installMode],
  );

  const readme = useMemo(
    () =>
      offline
        ? generateOfflinePortableReadme(zipUrl, cfg.packageDir)
        : generateManualPortableReadme(zipUrl, cfg.packageDir),
    [offline, zipUrl, cfg.packageDir],
  );

  const step =
    GUIDE_STEPS.find((s) => s.id === progress.stepId) ?? GUIDE_STEPS[0]!;
  const stepIndex = GUIDE_STEPS.findIndex((s) => s.id === step.id);
  const totalChecks = GUIDE_STEPS.reduce((n, s) => n + s.checklist.length, 0);
  const pct = totalChecks
    ? Math.round((progress.doneCount / totalChecks) * 100)
    : 0;

  function goStep(id: StepId) {
    progress.setStepId(id);
    setTab("guide");
  }

  function downloadAllScripts() {
    for (const s of scripts) {
      downloadTextFile(s.name, s.content);
    }
  }

  function downloadPortableSetup() {
    downloadTextFile(setupBatFilename, setupBat);
    downloadTextFile(
      offline ? "Portable-README-Offline.txt" : "Portable-README.txt",
      readme,
    );
  }

  return (
    <div className="min-h-[calc(100dvh-var(--grok-banner-h,0px))] overflow-x-hidden bg-bg text-fg">
      <header className="sticky top-[var(--grok-banner-h,0px)] z-40 border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg-elevated">
              <Package className="size-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">
                Chromium Portable Builder
              </p>
              <p className="truncate text-[11px] text-fg-subtle">
                Windows · 一鍵下載官方預編譯 → 可攜目錄
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={SOURCE_DOC}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-[var(--radius-sm)] border border-border px-3 py-2 text-xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg sm:inline-flex"
            >
              官方文件
              <ExternalLink className="size-3" />
            </a>
            <AuthSlot />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <section className="mb-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="min-w-0">
            <p className="mb-3 text-xs font-medium tracking-wide text-fg-subtle uppercase">
              不用自己編譯 · 約 2 分鐘
            </p>
            <h1 className="max-w-xl text-[clamp(1.75rem,1.2rem+2.5vw,2.75rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-fg">
              直接拿 Windows
              <br />
              Portable 版本
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-fg-muted sm:text-base">
              此預覽環境無法產生 Windows 二進位檔。請下載{" "}
              <strong className="font-medium text-fg">
                ChromiumPortable-Setup.bat
              </strong>
              ，在你的 Windows PC 上執行：它會從 Google 官方 CDN
              下載最新預編譯版，並自動做成免安裝可攜目錄。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={downloadPortableSetup}
                disabled={loadingRelease}
              >
                <Download className="size-4" />
                下載 Portable 安裝腳本
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTab("portable")}
              >
                <Zap className="size-4" />
                查看步驟
              </Button>
            </div>
          </div>

          <div className="min-w-0 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5 shadow-[var(--shadow-panel)]">
            <p className="mb-3 text-xs font-medium text-fg-muted">目前可用版本</p>
            {loadingRelease ? (
              <div className="flex items-center gap-2 text-sm text-fg-subtle">
                <Loader2 className="size-4 animate-spin" />
                讀取官方版本清單…
              </div>
            ) : releaseError ? (
              <p className="text-sm text-danger">{releaseError}</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-semibold tracking-tight text-fg">
                    {release?.version}
                  </p>
                  <p className="text-xs text-fg-subtle">
                    Chrome for Testing · Stable · rev {release?.revision}
                  </p>
                </div>
                {release?.snapshotRevision ? (
                  <p className="text-xs text-fg-muted">
                    另有純 Chromium 快照 r{release.snapshotRevision}
                  </p>
                ) : null}
                <a
                  href={zipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg"
                >
                  直接下載 zip（手動）
                  <ExternalLink className="size-3" />
                </a>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Stat
                icon={<HardDrive className="size-3.5" />}
                label="下載大小"
                value="~150–200 MB"
              />
              <Stat
                icon={<Cpu className="size-3.5" />}
                label="架構"
                value="Windows x64"
              />
              <Stat
                icon={<Terminal className="size-3.5" />}
                label="需求"
                value={offline ? "本機 zip + tar" : "curl + tar"}
              />
              <Stat
                icon={<Shield className="size-3.5" />}
                label="輸出"
                value="免安裝目錄"
              />
            </div>
          </div>
        </section>

        <div className="mb-6 flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-bg-elevated p-1">
          {(
            [
              { id: "portable" as const, label: "取得 Portable", icon: Zap },
              { id: "guide" as const, label: "從源碼建置", icon: BookOpen },
              { id: "scripts" as const, label: "源碼腳本", icon: Settings2 },
              { id: "faq" as const, label: "常見問題", icon: Shield },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-2 text-sm font-medium transition-colors sm:px-3",
                tab === t.id
                  ? "bg-bg-subtle text-fg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              <t.icon className="size-4 shrink-0 opacity-70" />
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>

        {tab === "portable" ? (
          <div className="min-w-0 space-y-6">
            <section className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5 shadow-[var(--shadow-panel)] sm:p-7">
              <h2 className="text-lg font-semibold tracking-tight">
                選擇預編譯來源
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                推薦用官方 Chrome for Testing（穩定、有版本號）。若你要持續整合快照版
                Chromium，可選 Snapshot。
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <SourceCard
                  active={source === "cft"}
                  title="Chrome for Testing"
                  subtitle={
                    release
                      ? `Stable ${release.version}`
                      : "Google 官方測試版二進位"
                  }
                  onClick={() => setSource("cft")}
                />
                <SourceCard
                  active={source === "snapshot"}
                  title="Chromium Snapshot"
                  subtitle={
                    release?.snapshotRevision
                      ? `Win_x64 r${release.snapshotRevision}`
                      : "最新持續建置快照"
                  }
                  onClick={() => setSource("snapshot")}
                />
              </div>

              <div className="mt-6">
                <p className="mb-2 text-xs font-medium text-fg-muted">安裝方式</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <SourceCard
                    active={!offline}
                    title="線上安裝"
                    subtitle="執行時自動下載（需網路）"
                    icon={<Cloud className="size-4 text-accent" />}
                    onClick={() => setInstallMode("online")}
                  />
                  <SourceCard
                    active={offline}
                    title="離線安裝"
                    subtitle="自備 zip，目標機免網路"
                    icon={<CloudOff className="size-4 text-accent" />}
                    onClick={() => setInstallMode("offline")}
                  />
                </div>
              </div>

              {offline ? (
                <div className="mt-4 rounded-[var(--radius-md)] border border-border bg-bg p-4 text-sm text-fg-muted">
                  <p className="font-medium text-fg">離線安裝：先下載 zip</p>
                  <p className="mt-1">
                    在有網路的電腦下載官方 zip，建議另存為{" "}
                    <code className="rounded bg-bg-subtle px-1 py-0.5 font-mono text-xs text-fg">
                      {expectedZipName}
                    </code>
                    ，和離線腳本放在同一資料夾（或執行時把 zip 拖曳到 .bat 上）。
                  </p>
                  <a
                    href={zipUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg"
                  >
                    下載 {expectedZipName}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              ) : null}

              <div className="mt-6">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-fg-muted">
                    可攜目錄路徑（寫入腳本）
                  </span>
                  <input
                    className="h-11 w-full rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm text-fg"
                    value={cfg.packageDir}
                    onChange={(e) =>
                      setCfg((c) => ({ ...c, packageDir: e.target.value }))
                    }
                    spellCheck={false}
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button type="button" onClick={downloadPortableSetup}>
                  <Download className="size-4" />
                  下載 {setupBatFilename}
                </Button>
                <a
                  href={zipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg-subtle px-4 text-sm font-medium text-fg transition-colors hover:border-border-strong"
                >
                  {offline ? `下載 ${expectedZipName}` : "只下載 zip"}
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              {(offline
                ? [
                    {
                      n: "1",
                      t: "備妥檔案",
                      d: `在有網路的電腦下載 ${expectedZipName}，和離線腳本放在同一資料夾，一起拷到目標機。`,
                    },
                    {
                      n: "2",
                      t: "離線執行",
                      d: "在目標機雙擊離線 .bat（或把 zip 拖到 .bat 上）：就地解壓、複製到 App\\，全程免網路。",
                    },
                    {
                      n: "3",
                      t: "可攜使用",
                      d: "之後只要跑 ChromiumPortable.bat；整包可拷到 USB。",
                    },
                  ]
                : [
                    {
                      n: "1",
                      t: "下載腳本",
                      d: "把 ChromiumPortable-Setup.bat 存到 Windows（例如桌面）。",
                    },
                    {
                      n: "2",
                      t: "雙擊執行",
                      d: "腳本會下載官方 zip、解壓、複製到 App\\，並建立啟動器。",
                    },
                    {
                      n: "3",
                      t: "可攜使用",
                      d: "之後只要跑 ChromiumPortable.bat；整包可拷到 USB。",
                    },
                  ]
              ).map((s) => (
                <div
                  key={s.n}
                  className="rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4"
                >
                  <span className="font-mono-tab text-xs text-fg-subtle">
                    Step {s.n}
                  </span>
                  <p className="mt-1 font-medium text-fg">{s.t}</p>
                  <p className="mt-1 text-sm text-fg-muted">{s.d}</p>
                </div>
              ))}
            </section>

            <section className="min-w-0 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5 sm:p-7">
              <h3 className="mb-3 text-sm font-semibold">完成後的目錄結構</h3>
              <CodeBlock
                language="text"
                label={cfg.packageDir}
                code={`${cfg.packageDir}\\
├── ChromiumPortable.bat
├── README.txt
├── App\\
│   └── chrome.exe  (+ dlls, locales, …)
└── Data\\           ← 設定與快取（可攜）
`}
              />
            </section>

            <section className="min-w-0 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5 sm:p-7">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  Setup 腳本預覽{offline ? "（離線）" : ""}
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadTextFile(setupBatFilename, setupBat)}
                >
                  <Download className="size-3.5" />
                  下載 .bat
                </Button>
              </div>
              <CodeBlock
                code={setupBat}
                filename={setupBatFilename}
                language="batch"
                label={`${versionLabel}${offline ? " · offline" : ""}`}
              />
            </section>

            <p className="text-center text-xs text-fg-subtle">
              這不是 Google Chrome 產品頁下載；Chrome for Testing / Chromium
              快照供測試與可攜封裝。重新分發時請遵守授權，勿使用 Chrome 商標。
            </p>
          </div>
        ) : null}

        {tab === "guide" ? (
          <div className="grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <nav
              aria-label="建置步驟"
              className="h-fit min-w-0 rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-2 lg:sticky lg:top-[calc(var(--grok-banner-h,0px)+4.5rem)]"
            >
              <ol className="space-y-0.5">
                {GUIDE_STEPS.map((s) => {
                  const done = s.checklist.every(
                    (_, i) => progress.checked[`${s.id}-${i}`],
                  );
                  const active = s.id === step.id;
                  return (
                    <li key={s.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => goStep(s.id)}
                        className={cn(
                          "flex w-full min-w-0 items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2.5 text-left text-sm transition-colors",
                          active
                            ? "bg-bg-subtle text-fg"
                            : "text-fg-muted hover:bg-bg/60 hover:text-fg",
                        )}
                      >
                        <span
                          className={cn(
                            "font-mono-tab flex size-6 shrink-0 items-center justify-center rounded-full text-[11px]",
                            done
                              ? "bg-success/15 text-success"
                              : active
                                ? "bg-accent text-accent-fg"
                                : "bg-bg text-fg-subtle",
                          )}
                        >
                          {done ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : (
                            s.number
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {s.title}
                        </span>
                        <ChevronRight className="size-3.5 shrink-0 opacity-40" />
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-3 border-t border-border px-2 pt-3">
                <div className="mb-1 flex justify-between text-[11px] text-fg-subtle">
                  <span>檢查清單</span>
                  <span className="font-mono-tab">
                    {progress.doneCount}/{totalChecks}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-bg-subtle">
                  <div
                    className="h-full bg-accent transition-[width]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-fg-subtle"
                  onClick={progress.reset}
                >
                  <RotateCcw className="size-3.5" />
                  重設
                </Button>
              </div>
            </nav>

            <article className="min-w-0 overflow-hidden rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5 shadow-[var(--shadow-panel)] sm:p-7">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                <span className="font-mono-tab">
                  Step {step.number}/{GUIDE_STEPS.length}
                </span>
                <span aria-hidden>·</span>
                <span>{step.titleEn}</span>
                <span aria-hidden>·</span>
                <span>{step.duration}</span>
              </div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {step.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
                {step.summary}
              </p>

              {step.id === "requirements" ? (
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {REQUIREMENTS.map((r) => (
                    <div
                      key={r.label}
                      className="min-w-0 rounded-[var(--radius-md)] border border-border bg-bg p-3"
                    >
                      <p className="text-xs font-medium text-fg-subtle">
                        {r.label}
                      </p>
                      <p className="mt-1 break-words text-sm text-fg">
                        {r.detail}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-8">
                <h3 className="mb-3 text-xs font-medium tracking-wide text-fg-subtle uppercase">
                  檢查清單
                </h3>
                <Checklist
                  items={step.checklist}
                  checked={progress.checked}
                  onToggle={progress.toggle}
                  idPrefix={step.id}
                />
              </div>

              {step.commands.length > 0 ? (
                <div className="mt-8 min-w-0 space-y-4">
                  <h3 className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
                    指令
                  </h3>
                  {step.commands.map((c) => (
                    <CodeBlock
                      key={c.label}
                      label={c.label}
                      code={c.code}
                      language={c.shell ?? "cmd"}
                    />
                  ))}
                </div>
              ) : null}

              {step.notes.length > 0 ? (
                <div className="mt-8 rounded-[var(--radius-md)] border border-border bg-bg p-4">
                  <h3 className="mb-2 text-xs font-medium text-fg-muted">注意</h3>
                  <ul className="space-y-2 text-sm text-fg-muted">
                    {step.notes.map((n) => (
                      <li key={n} className="flex gap-2">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-fg-subtle" />
                        <span className="min-w-0 break-words">{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={stepIndex <= 0}
                  onClick={() =>
                    goStep(GUIDE_STEPS[Math.max(0, stepIndex - 1)]!.id)
                  }
                >
                  上一步
                </Button>
                <Button
                  type="button"
                  disabled={stepIndex >= GUIDE_STEPS.length - 1}
                  onClick={() =>
                    goStep(
                      GUIDE_STEPS[
                        Math.min(GUIDE_STEPS.length - 1, stepIndex + 1)
                      ]!.id,
                    )
                  }
                >
                  下一步
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </article>
          </div>
        ) : null}

        {tab === "scripts" ? (
          <div className="min-w-0 space-y-6">
            <section className="min-w-0 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5 sm:p-7">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight">
                    從源碼建置用腳本
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-fg-muted">
                    需要自己編譯時使用。若只想要 portable，請用「取得
                    Portable」分頁。
                  </p>
                </div>
                <Button type="button" onClick={downloadAllScripts}>
                  <Download className="size-4" />
                  下載全部
                </Button>
              </div>
              <PortableConfigForm value={cfg} onChange={setCfg} />
            </section>
            <section className="grid min-w-0 gap-4 lg:grid-cols-2">
              <div className="min-w-0 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5">
                <h3 className="mb-3 text-sm font-semibold">args.gn</h3>
                <CodeBlock
                  code={gnArgs}
                  filename="args.gn"
                  language="gn"
                  label="out/Portable/args.gn"
                />
              </div>
              <div className="min-w-0 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5">
                <h3 className="mb-3 text-sm font-semibold">腳本</h3>
                <ul className="space-y-2">
                  {scripts.map((s) => (
                    <li
                      key={s.name}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2.5"
                    >
                      <p className="truncate font-mono text-xs text-fg">
                        {s.name}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => downloadTextFile(s.name, s.content)}
                      >
                        <Download className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        ) : null}

        {tab === "faq" ? (
          <section className="min-w-0 space-y-3">
            <details
              open
              className="group rounded-[var(--radius-lg)] border border-border bg-bg-elevated open:shadow-[var(--shadow-panel)]"
            >
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  <span>為什麼不能直接給我 chrome.exe？</span>
                  <ChevronRight className="size-4 shrink-0 text-fg-subtle transition-transform group-open:rotate-90" />
                </span>
              </summary>
              <div className="border-t border-border px-5 py-4 text-sm leading-relaxed text-fg-muted">
                這個預覽跑在 Linux 沙箱，無法產出或託管完整的 Windows
                Chromium（約 150MB+ zip）。請用「取得 Portable」下載
                Setup.bat，在你自己的 Windows 上下載官方預編譯並打包——結果就是可攜版。
              </div>
            </details>
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-[var(--radius-lg)] border border-border bg-bg-elevated open:shadow-[var(--shadow-panel)]"
              >
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0">{item.q}</span>
                    <ChevronRight className="size-4 shrink-0 text-fg-subtle transition-transform group-open:rotate-90" />
                  </span>
                </summary>
                <div className="border-t border-border px-5 py-4 text-sm leading-relaxed text-fg-muted">
                  {item.a}
                </div>
              </details>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function SourceCard({
  active,
  title,
  subtitle,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
        active
          ? "border-border-strong bg-bg-subtle"
          : "border-border bg-bg hover:border-border-strong",
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-medium text-fg">{title}</p>
      </div>
      <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>
    </button>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[var(--radius-sm)] border border-border bg-bg px-2.5 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-fg-subtle">
        {icon}
        <span>{label}</span>
      </div>
      <p className="break-words font-medium text-fg">{value}</p>
    </div>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="size-8 animate-pulse rounded-full bg-bg-subtle" aria-hidden />
    );
  }
  if (user) {
    return (
      <SignedIn>
        <UserButton />
      </SignedIn>
    );
  }
  return (
    <SignedOut>
      <Link
        to="/login"
        className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-border px-3 text-xs font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
      >
        登入
      </Link>
    </SignedOut>
  );
}
