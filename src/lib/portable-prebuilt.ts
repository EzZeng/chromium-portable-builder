/** One-shot Windows portable packager using official prebuilt binaries (no compile). */

export type PrebuiltChannel = "stable" | "beta" | "dev" | "canary";
export type PrebuiltPlatform = "win64" | "win32";

export interface ChromeForTestingRelease {
  channel: string;
  version: string;
  revision: string;
  platform: PrebuiltPlatform;
  zipUrl: string;
  source: "chrome-for-testing";
}

export interface SnapshotRelease {
  platform: "Win_x64" | "Win";
  revision: string;
  zipUrl: string;
  source: "chromium-snapshot";
}

const CFT_JSON =
  "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json";

const SNAPSHOT_REDIRECT = "https://download-chromium.appspot.com/dl/Win_x64?type=snapshots";

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

export async function fetchChromeForTesting(
  channel: PrebuiltChannel = "stable",
  platform: PrebuiltPlatform = "win64",
): Promise<ChromeForTestingRelease> {
  const res = await fetch(CFT_JSON);
  if (!res.ok) throw new Error(`無法讀取 Chrome for Testing 版本清單 (${res.status})`);
  const data = (await res.json()) as CftJson;
  const key =
    channel === "stable"
      ? "Stable"
      : channel === "beta"
        ? "Beta"
        : channel === "dev"
          ? "Dev"
          : "Canary";
  const ch = data.channels[key];
  if (!ch) throw new Error(`找不到 channel: ${key}`);
  const item = ch.downloads.chrome?.find((d) => d.platform === platform);
  if (!item?.url) throw new Error(`找不到 ${platform} 下載連結`);
  return {
    channel: ch.channel,
    version: ch.version,
    revision: ch.revision,
    platform,
    zipUrl: item.url,
    source: "chrome-for-testing",
  };
}

export async function fetchChromiumSnapshotRedirect(): Promise<SnapshotRelease> {
  // HEAD follows redirect to the actual GCS object
  const res = await fetch(SNAPSHOT_REDIRECT, { method: "HEAD", redirect: "follow" });
  const url = res.url || SNAPSHOT_REDIRECT;
  const m = url.match(/Win_x64\/(\d+)\//);
  return {
    platform: "Win_x64",
    revision: m?.[1] ?? "latest",
    zipUrl: url,
    source: "chromium-snapshot",
  };
}

export type InstallMode = "online" | "offline";

/**
 * The zip's own filename as served by the CDN — used as the recommended local
 * filename for offline mode (Chrome for Testing → `chrome-win64.zip`, snapshot
 * → `chrome-win.zip`). Falls back to a sensible default when the URL is opaque
 * (e.g. the snapshot redirect endpoint).
 */
export function zipBasenameFromUrl(zipUrl: string): string {
  try {
    const last = new URL(zipUrl).pathname.split("/").filter(Boolean).pop() ?? "";
    if (last.toLowerCase().endsWith(".zip")) return last;
  } catch {
    // opaque / non-URL — fall through to default
  }
  return "chrome-win64.zip";
}

export function generatePrebuiltPortableBat(opts: {
  packageDir: string;
  zipUrl: string;
  label: string;
  /**
   * `online` (default): download the zip from the CDN at run time.
   * `offline`: install from a zip already sitting next to the script (or dragged
   * onto it) — no network needed on the target PC.
   */
  mode?: InstallMode;
  /** chrome-win64 folder name inside CfT zip; snapshot uses chrome-win */
  innerFolderHint?: string;
}): string {
  const mode: InstallMode = opts.mode ?? "online";
  const offline = mode === "offline";
  const dest = opts.packageDir.replace(/\//g, "\\");
  const localZipName = zipBasenameFromUrl(opts.zipUrl);

  // Step 1 differs by mode; steps 2–4 (extract → copy → launcher) are shared.
  const acquireBlock = offline
    ? `echo [1/4] 尋找本機 zip...
REM 依序尋找：拖曳到 .bat 上的檔案 → 腳本旁的 ${localZipName} → 腳本旁任何 *.zip
set "ZIP="
if not "%~1"=="" if exist "%~1" set "ZIP=%~1"
if "%ZIP%"=="" if exist "%ROOT%${localZipName}" set "ZIP=%ROOT%${localZipName}"
if "%ZIP%"=="" for %%F in ("%ROOT%*.zip") do if not defined ZIP set "ZIP=%%~fF"
if "%ZIP%"=="" (
  echo ERROR: 找不到離線安裝用的 zip 檔。
  echo   1^) 在有網路的電腦下載官方預編譯 zip：
  echo      %URL%
  echo   2^) 建議另存為 ${localZipName}，放到此腳本旁 ^(%ROOT%^)，
  echo      或直接把 zip 拖曳到此 .bat 上執行。
  pause
  exit /b 1
)
echo  Zip : %ZIP%`
    : `where curl >nul 2>&1
if errorlevel 1 (
  echo ERROR: 需要 curl.exe ^(Windows 10 1803+ 內建^)。
  echo 或改用「離線安裝」版本：先下載 zip 再用離線腳本安裝。
  pause
  exit /b 1
)

echo [1/4] 下載中 ^(約 150–200 MB，請稍候^)...
set "ZIP=%TEMP%\\chromium-download.zip"
curl.exe -L --retry 3 --retry-delay 2 -o "%ZIP%" "%URL%"
if errorlevel 1 (
  echo ERROR: 下載失敗。請檢查網路或改用「離線安裝」版本。
  pause
  exit /b 1
)`;

  // Offline keeps the user-supplied zip; online removes its temp download.
  const zipCleanup = offline ? "" : `del /f /q "%ZIP%" >nul 2>&1\n`;
  const sourceLine = offline
    ? `echo  Mode   : offline ^(本機 zip，免下載^)`
    : `echo  Source : %URL%`;
  const readmeSource = offline
    ? `echo Installed offline from a local zip.`
    : `echo Zip: ${opts.zipUrl}`;

  return `@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Chromium Portable Setup${offline ? " (Offline)" : ""}

REM ============================================================
REM  Chromium / Chrome-for-Testing → Windows Portable
REM  ${opts.label}
REM  Mode: ${offline ? "offline (install from local zip, no download)" : "online (download at run time)"}
REM  Generated by Chromium Portable Builder
REM ============================================================

set "ROOT=%~dp0"
set "DEST=${dest}"
if "%DEST:~1,1%"==":" (
  REM absolute path ok
) else (
  set "DEST=%ROOT%${dest}"
)

set "APP=%DEST%\\App"
set "DATA=%DEST%\\Data"
set "EXTRACT=%TEMP%\\chromium-portable-extract"
set "URL=${opts.zipUrl}"

echo.
echo  [Chromium Portable]
echo  Target : %DEST%
${sourceLine}
echo.

${acquireBlock}

if not exist "%DEST%" mkdir "%DEST%"
if not exist "%APP%" mkdir "%APP%"
if not exist "%DATA%" mkdir "%DATA%"

echo [2/4] 解壓縮...
if exist "%EXTRACT%" rmdir /s /q "%EXTRACT%"
mkdir "%EXTRACT%"
tar -xf "%ZIP%" -C "%EXTRACT%"
if errorlevel 1 (
  echo tar 失敗，改試 PowerShell Expand-Archive...
  powershell -NoProfile -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%EXTRACT%' -Force"
  if errorlevel 1 (
    echo ERROR: 無法解壓。請手動解壓 zip 到 %APP%
    pause
    exit /b 1
  )
)

echo [3/4] 複製到 App\\ ...
REM Chrome for Testing: chrome-win64\\  ; Chromium snapshot: chrome-win\\
set "SRC="
if exist "%EXTRACT%\\chrome-win64\\chrome.exe" set "SRC=%EXTRACT%\\chrome-win64"
if exist "%EXTRACT%\\chrome-win\\chrome.exe" set "SRC=%EXTRACT%\\chrome-win"
if exist "%EXTRACT%\\Chrome-bin\\chrome.exe" set "SRC=%EXTRACT%\\Chrome-bin"
if "%SRC%"=="" (
  for /d %%D in ("%EXTRACT%\\*") do (
    if exist "%%~fD\\chrome.exe" set "SRC=%%~fD"
  )
)
if "%SRC%"=="" if exist "%EXTRACT%\\chrome.exe" set "SRC=%EXTRACT%"

if "%SRC%"=="" (
  echo ERROR: 解壓後找不到 chrome.exe
  echo 請檢查 %EXTRACT%
  pause
  exit /b 1
)

echo  From: %SRC%
robocopy "%SRC%" "%APP%" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul
set "RC=!ERRORLEVEL!"
if !RC! GEQ 8 (
  echo robocopy failed: !RC!
  pause
  exit /b 1
)
if not exist "%APP%\\chrome.exe" (
  echo ERROR: 複製後沒有 chrome.exe
  pause
  exit /b 1
)

echo [4/4] 寫入啟動器...
> "%DEST%\\ChromiumPortable.bat" (
  echo @echo off
  echo setlocal
  echo set "ROOT=%%~dp0"
  echo set "APP=%%ROOT%%App"
  echo set "DATA=%%ROOT%%Data"
  echo if not exist "%%DATA%%" mkdir "%%DATA%%"
  echo start "" "%%APP%%\\chrome.exe" --user-data-dir="%%DATA%%" --no-default-browser-check --disable-logging %%*
)

> "%DEST%\\README.txt" (
  echo Chromium Portable ^(Windows^)
  echo ============================
  echo.
  echo Run: ChromiumPortable.bat
  echo Profile data: Data\\
  echo Browser files: App\\
  echo.
  echo Built from: ${opts.label}
  ${readmeSource}
  echo.
  echo Copy the whole folder to USB / another PC. No install required.
  echo This is NOT Google Chrome. Do not use Chrome trademarks when redistributing.
)

${zipCleanup}rmdir /s /q "%EXTRACT%" >nul 2>&1

echo.
echo  完成！
echo  啟動: %DEST%\\ChromiumPortable.bat
echo  整包資料夾可複製到 USB 使用。
echo.
start "" "%DEST%\\ChromiumPortable.bat"
pause
`;
}

export function generateOfflinePortableReadme(
  zipUrl: string,
  packageDir: string,
): string {
  const localZipName = zipBasenameFromUrl(zipUrl);
  return `Chromium Windows Portable — 離線安裝
=====================================

適用於目標電腦沒有網路的情況。分兩段進行：

【在有網路的電腦】
1. 下載官方預編譯 zip（另存為 ${localZipName}）：
   ${zipUrl}
2. 把 ChromiumPortable-Setup-Offline.bat 和這個 zip 放在同一個資料夾，
   一起拷貝到 USB / 目標電腦。

【在離線的目標電腦】
3. 雙擊 ChromiumPortable-Setup-Offline.bat
   （或直接把 zip 拖曳到 .bat 上）。
   腳本會就地解壓、複製到 ${packageDir}\\App\\，並建立 ChromiumPortable.bat。
   全程不需網路。

之後只要跑 ${packageDir}\\ChromiumPortable.bat 即可；設定會存在 Data\\，
整包資料夾可再搬到其他電腦。
`;
}

export function generateManualPortableReadme(zipUrl: string, packageDir: string): string {
  return `Chromium Windows Portable — 手動 3 步
=====================================

1. 下載官方預編譯 zip：
   ${zipUrl}

2. 解壓，將內含 chrome.exe 的資料夾內容放到：
   ${packageDir}\\App\\

3. 在 ${packageDir}\\ 建立 ChromiumPortable.bat，內容：

@echo off
set "ROOT=%~dp0"
start "" "%ROOT%App\\chrome.exe" --user-data-dir="%ROOT%Data" --no-default-browser-check %*

然後雙擊 ChromiumPortable.bat 即可。設定會存在 Data\\，整包可搬到其他電腦。
`;
}
