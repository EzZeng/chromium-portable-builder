/** Content adapted from Chromium Windows build instructions + portable packaging. */

export type StepId =
  | "requirements"
  | "depot-tools"
  | "fetch"
  | "gn-args"
  | "build"
  | "package"
  | "run";

export interface GuideStep {
  id: StepId;
  number: number;
  title: string;
  titleEn: string;
  summary: string;
  duration: string;
  checklist: string[];
  commands: { label: string; code: string; shell?: "cmd" | "powershell" | "gn" }[];
  notes: string[];
}

export const SOURCE_DOC =
  "https://chromium.googlesource.com/chromium/src/+/main/docs/windows_build_instructions.md";

export const REQUIREMENTS = [
  {
    label: "CPU / RAM",
    detail: "x86-64，建議 ≥16 GB RAM（最低 8 GB）",
  },
  {
    label: "磁碟",
    detail: "NTFS，至少 100 GB 可用空間（完整 release 建置建議 150 GB+）",
  },
  {
    label: "作業系統",
    detail: "Windows 10 或更新",
  },
  {
    label: "Visual Studio",
    detail: "VS 2026（≥18.0.0）含 Desktop development with C++、MFC/ATL",
  },
  {
    label: "Windows SDK",
    detail: "Windows 11 SDK 10.0.28000.2270 + Debugging Tools",
  },
  {
    label: "Git",
    detail: "Git for Windows（≥2.16.1），並關閉 App Execution Alias 的 python",
  },
] as const;

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: "requirements",
    number: 1,
    title: "環境需求",
    titleEn: "System requirements",
    summary:
      "確認硬體、Visual Studio、Windows SDK 與 Git 皆就緒。可攜版建置建議使用 Release + 非 component 以減少 DLL 散落。",
    duration: "約 30–90 分鐘（安裝工具）",
    checklist: [
      "已安裝 Visual Studio 2026 + C++ 桌面開發 + MFC/ATL",
      "已安裝指定 Windows 11 SDK 與 Debugging Tools",
      "磁碟為 NTFS，可用空間 ≥100 GB",
      "Git for Windows 已更新",
      "已停用 Windows App Execution Alias 的 python.exe / python3.exe",
    ],
    commands: [
      {
        label: "檢查 Git 版本",
        code: "git --version",
        shell: "cmd",
      },
      {
        label: "確認 python 不會搶到系統別名（應優先看到 depot_tools）",
        code: "where python3",
        shell: "cmd",
      },
    ],
    notes: [
      "官方文件要求使用 cmd.exe 做初始設定，避免 Cygwin / PowerShell 當主環境。",
      "若出現檔案系統錯誤，可關閉 Windows Indexing 對原始碼目錄的索引。",
    ],
  },
  {
    id: "depot-tools",
    number: 2,
    title: "安裝 depot_tools",
    titleEn: "Depot tools",
    summary: "Chromium 建置依賴 depot_tools（gclient、gn、autoninja 等）。",
    duration: "約 5–15 分鐘",
    checklist: [
      "已 clone depot_tools 到 C:\\src\\depot_tools",
      "PATH 最前方加入 C:\\src\\depot_tools",
      "設定 DEPOT_TOOLS_WIN_TOOLCHAIN=0（使用本機 VS）",
      "首次執行 gclient 完成引導安裝",
    ],
    commands: [
      {
        label: "建立目錄並 clone",
        code: `mkdir C:\\src
cd C:\\src
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git`,
        shell: "cmd",
      },
      {
        label: "環境變數（使用者或系統，永久設定）",
        code: `setx PATH "C:\\src\\depot_tools;%PATH%"
setx DEPOT_TOOLS_WIN_TOOLCHAIN 0
REM 若 VS 不在預設路徑，可設：
REM setx vs2026_install "C:\\Program Files\\Microsoft Visual Studio\\2026\\Professional"`,
        shell: "cmd",
      },
      {
        label: "初始化（新開 cmd 視窗後）",
        code: "gclient",
        shell: "cmd",
      },
    ],
    notes: [
      "depot_tools 必須排在系統 Python / Git 之前。",
      "setx 後請重新開啟 cmd，PATH 才會生效。",
    ],
  },
  {
    id: "fetch",
    number: 3,
    title: "取得 Chromium 原始碼",
    titleEn: "Fetch source",
    summary: "使用 fetch chromium 下載完整原始碼與相依專案（可能超過 1 小時）。",
    duration: "1–4 小時（視網路）",
    checklist: [
      "已設定 git user.name / user.email",
      "core.autocrlf=false、core.filemode=false",
      "fetch chromium 完成且無致命錯誤",
      "必要時已執行 gclient sync",
    ],
    commands: [
      {
        label: "Git 全域設定（官方建議）",
        code: `git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global core.autocrlf false
git config --global core.filemode false
git config --global core.preloadindex true
git config --global core.fscache true
git config --global branch.autosetuprebase always
git config --global core.longpaths true`,
        shell: "cmd",
      },
      {
        label: "下載原始碼",
        code: `mkdir C:\\src\\chromium
cd C:\\src\\chromium
fetch chromium
cd src`,
        shell: "cmd",
      },
      {
        label: "若 sub-repo 失敗",
        code: "gclient sync",
        shell: "cmd",
      },
    ],
    notes: [
      "fetch 期間請保持電腦不休眠。",
      "可用 fetch --no-history 減少歷史量（不適合需要完整 git 歷史的開發）。",
    ],
  },
  {
    id: "gn-args",
    number: 4,
    title: "設定 GN（可攜 Release）",
    titleEn: "GN args for portable",
    summary:
      "產生 out\\Portable 建置目錄。可攜版建議 is_debug=false、is_component_build=false，並關閉不必要的符號以加速。",
    duration: "約 5 分鐘",
    checklist: [
      "已執行 gn gen out\\Portable",
      "已寫入可攜版 GN args",
      "確認 target_cpu 為 x64（或你需要的架構）",
    ],
    commands: [
      {
        label: "產生建置目錄",
        code: "gn gen out\\Portable",
        shell: "cmd",
      },
      {
        label: "編輯 args（或使用本工具產生的 args.gn）",
        code: "gn args out\\Portable",
        shell: "cmd",
      },
    ],
    notes: [
      "官方預設 out\\Default 偏 debug/component，不利於打包可攜目錄。",
      "is_component_build=true 會產生大量 DLL，適合開發不適合可攜發佈。",
    ],
  },
  {
    id: "build",
    number: 5,
    title: "編譯 chrome",
    titleEn: "Build chrome",
    summary: "使用 autoninja 編譯 chrome 目標。完整 Release 首次建置可能需數小時。",
    duration: "2–12 小時（視 CPU/RAM）",
    checklist: [
      "已將 src 與 out 排除在防毒即時掃描之外",
      "autoninja -C out\\Portable chrome 成功結束",
      "out\\Portable\\chrome.exe 存在",
    ],
    commands: [
      {
        label: "編譯瀏覽器",
        code: "autoninja -C out\\Portable chrome",
        shell: "cmd",
      },
      {
        label: "（可選）也建 mini_installer",
        code: "autoninja -C out\\Portable mini_installer",
        shell: "cmd",
      },
    ],
    notes: [
      "增量建置：改碼後再跑同一條 autoninja 即可。",
      "只建 chrome 比建全部目標快很多。",
    ],
  },
  {
    id: "package",
    number: 6,
    title: "打包可攜目錄",
    titleEn: "Package portable",
    summary:
      "將 out\\Portable 中執行 chrome 所需檔案複製到獨立資料夾，並附上以相對路徑 --user-data-dir 啟動的捷徑／批次檔。",
    duration: "約 10–20 分鐘",
    checklist: [
      "已複製 chrome.exe 與必要 DLL / 資源到 PortableChromium\\App",
      "已建立 Data 資料夾存放設定檔",
      "已建立 ChromiumPortable.bat 啟動器",
      "可在另一台同架構 Windows 上直接執行（免安裝）",
    ],
    commands: [
      {
        label: "建議使用本工具產生的 package-portable.bat",
        code: "package-portable.bat",
        shell: "cmd",
      },
    ],
    notes: [
      "官方文件以 mini_installer 為安裝包路徑；可攜版是把建置產物 + 相對 user-data-dir 綁在一起。",
      "component build 的 DLL 路徑複雜，強烈建議 Release non-component。",
      "請遵守 Chromium / 相關商標與授權條款再重新分發。",
    ],
  },
  {
    id: "run",
    number: 7,
    title: "啟動與驗證",
    titleEn: "Run & verify",
    summary: "用可攜啟動器開啟，確認設定寫入 Data 目錄、不依賴系統安裝路徑。",
    duration: "約 5 分鐘",
    checklist: [
      "ChromiumPortable.bat 可正常啟動",
      "關閉後設定出現在 PortableChromium\\Data",
      "chrome://version 顯示正確路徑",
      "可整包複製到 USB 再執行",
    ],
    commands: [
      {
        label: "直接從建置目錄測試",
        code: "out\\Portable\\chrome.exe --user-data-dir=%CD%\\PortableChromium\\Data",
        shell: "cmd",
      },
      {
        label: "可攜啟動器",
        code: "PortableChromium\\ChromiumPortable.bat",
        shell: "cmd",
      },
    ],
    notes: [
      "首次啟動會建立 Preferences 等檔案於 Data。",
      "若缺 DLL，回頭用 package 腳本從 out\\Portable 補齊。",
    ],
  },
];

export interface PortableConfig {
  srcRoot: string;
  outDir: string;
  packageDir: string;
  targetCpu: "x64" | "x86" | "arm64";
  isOfficialBuild: boolean;
  symbolLevel: 0 | 1 | 2;
  enablePdf: boolean;
  enableWidevinePlaceholder: boolean;
}

export const DEFAULT_CONFIG: PortableConfig = {
  srcRoot: "C:\\src\\chromium\\src",
  outDir: "out\\Portable",
  packageDir: "C:\\PortableChromium",
  targetCpu: "x64",
  isOfficialBuild: false,
  symbolLevel: 0,
  enablePdf: true,
  enableWidevinePlaceholder: false,
};

export function generateGnArgs(cfg: PortableConfig): string {
  return `# Generated by Chromium Portable Builder
# Paste into: gn args ${cfg.outDir}
# Or write to ${cfg.outDir}\\args.gn then: gn gen ${cfg.outDir}

is_debug = false
is_component_build = false
is_official_build = ${cfg.isOfficialBuild}
target_cpu = "${cfg.targetCpu}"
symbol_level = ${cfg.symbolLevel}
blink_symbol_level = 0
v8_symbol_level = 0
# Faster links on Windows when symbols are not needed for shipping portable
enable_nacl = false
${cfg.enablePdf ? "" : "enable_pdf = false\n"}# Optional: strip more if you know you don't need them
# proprietary_codecs = false
`.trimStart();
}

export function generateSetupDepotToolsBat(): string {
  return `@echo off
setlocal EnableExtensions
REM Chromium Portable Builder — install depot_tools
REM Run in cmd.exe as a normal user with write access to C:\\src

if not exist C:\\src mkdir C:\\src
cd /d C:\\src

if exist C:\\src\\depot_tools\\gclient.bat (
  echo [OK] depot_tools already present at C:\\src\\depot_tools
) else (
  echo Cloning depot_tools...
  git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
  if errorlevel 1 (
    echo ERROR: git clone failed. Install Git for Windows first.
    exit /b 1
  )
)

echo.
echo Add C:\\src\\depot_tools to the FRONT of your User PATH, then reopen cmd.
echo Also set:
echo   setx DEPOT_TOOLS_WIN_TOOLCHAIN 0
echo.
echo After reopening cmd, run: gclient
echo.
pause
`;
}

export function generateFetchBat(cfg: PortableConfig): string {
  return `@echo off
setlocal EnableExtensions
REM Chromium Portable Builder — fetch Chromium source
REM Requires depot_tools on PATH and DEPOT_TOOLS_WIN_TOOLCHAIN=0

git config --global core.autocrlf false
git config --global core.filemode false
git config --global core.preloadindex true
git config --global core.fscache true
git config --global branch.autosetuprebase always
git config --global core.longpaths true

if not exist C:\\src\\chromium mkdir C:\\src\\chromium
cd /d C:\\src\\chromium

if exist src\\.gclient (
  echo Source tree exists — running gclient sync...
  cd src
  gclient sync
) else if exist .gclient (
  echo Running gclient sync in chromium root...
  gclient sync
) else (
  echo Fetching chromium (this can take hours)...
  fetch chromium
  if errorlevel 1 (
    echo Fetch reported errors — try: gclient sync
    exit /b 1
  )
)

echo.
echo Done. Next: open ${cfg.srcRoot} and generate ${cfg.outDir}
pause
`;
}

export function generateBuildBat(cfg: PortableConfig): string {
  const gn = generateGnArgs(cfg).replace(/\r?\n/g, "\r\n");
  return `@echo off
setlocal EnableExtensions
REM Chromium Portable Builder — GN + build chrome
cd /d "${cfg.srcRoot}"
if errorlevel 1 (
  echo ERROR: cannot cd to ${cfg.srcRoot}
  exit /b 1
)

if not exist "${cfg.outDir}" mkdir "${cfg.outDir}"

echo Writing ${cfg.outDir}\\args.gn ...
> "${cfg.outDir}\\args.gn" (
${gn
  .split("\n")
  .map((line) => `  echo ${line.replace(/%/g, "%%")}`)
  .join("\r\n")}
)

echo Running gn gen...
call gn gen "${cfg.outDir}"
if errorlevel 1 exit /b 1

echo Building chrome (long running)...
call autoninja -C "${cfg.outDir}" chrome
if errorlevel 1 exit /b 1

echo.
echo Build finished: ${cfg.srcRoot}\\${cfg.outDir}\\chrome.exe
pause
`;
}

export function generatePackageBat(cfg: PortableConfig): string {
  const outAbs = `${cfg.srcRoot}\\${cfg.outDir}`;
  return `@echo off
setlocal EnableExtensions EnableDelayedExpansion
REM Chromium Portable Builder — package a portable folder
REM Copies runtime files from a non-component Release build and writes a launcher.

set "OUT=${outAbs}"
set "DEST=${cfg.packageDir}"
set "APP=%DEST%\\App"
set "DATA=%DEST%\\Data"

if not exist "%OUT%\\chrome.exe" (
  echo ERROR: chrome.exe not found at "%OUT%\\chrome.exe"
  echo Build first: autoninja -C ${cfg.outDir} chrome
  exit /b 1
)

echo Creating portable layout at "%DEST%" ...
if not exist "%APP%" mkdir "%APP%"
if not exist "%DATA%" mkdir "%DATA%"

echo Syncing build output into App\\ (robocopy)...
REM Mirror is aggressive — use /E copy without purge of unrelated files first-time
robocopy "%OUT%" "%APP%" /E /XD obj gen pyproto clang_x64 clang_x86 clang_arm64 /XF *.pdb *.lib *.exp *.ilk *.map *.json *.ninja* *.rsp *.runtime_deps args.gn build.ninja* toolchain.ninja* .siso* .landmines* *.toc *.d /NFL /NDL /NJH /NJS /nc /ns /np
set "RC=!ERRORLEVEL!"
if !RC! GEQ 8 (
  echo robocopy failed with code !RC!
  exit /b 1
)

REM Fallback minimal set if robocopy filtered too hard
if not exist "%APP%\\chrome.exe" copy /Y "%OUT%\\chrome.exe" "%APP%\\" >nul

echo Writing launcher...
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
  echo Chromium Portable package
  echo -------------------------
  echo Run ChromiumPortable.bat — profile lives in Data\\
  echo Built from: ${cfg.outDir}  target_cpu=${cfg.targetCpu}
  echo Source guide: ${SOURCE_DOC}
  echo.
  echo Redistribute only under Chromium licenses. Do not use Google Chrome trademarks.
)

echo.
echo Portable package ready:
echo   %DEST%\\ChromiumPortable.bat
echo   %DEST%\\App\\chrome.exe
echo   %DEST%\\Data\\
echo.
echo Tip: copy the entire "%DEST%" folder to USB or another PC.
pause
`;
}

export function generateMasterBat(cfg: PortableConfig): string {
  return `@echo off
setlocal EnableExtensions
REM Chromium Portable Builder — master checklist driver
REM This does NOT auto-run multi-hour fetch/build; it prints the recommended order.

echo ============================================
echo  Chromium Windows Portable — recommended flow
echo ============================================
echo.
echo 1^) Install VS 2026 + Win SDK + Git ^(see requirements^)
echo 2^) Run 01-setup-depot-tools.bat then set PATH + DEPOT_TOOLS_WIN_TOOLCHAIN=0
echo 3^) Reopen cmd, run gclient once
echo 4^) Run 02-fetch-chromium.bat
echo 5^) Run 03-build-portable.bat  ^(writes GN args + autoninja chrome^)
echo 6^) Run 04-package-portable.bat
echo 7^) Start ${cfg.packageDir}\\ChromiumPortable.bat
echo.
echo Config snapshot:
echo   src   = ${cfg.srcRoot}
echo   out   = ${cfg.outDir}
echo   pack  = ${cfg.packageDir}
echo   cpu   = ${cfg.targetCpu}
echo.
echo Official docs:
echo   ${SOURCE_DOC}
echo.
pause
`;
}

export function generateAllScripts(cfg: PortableConfig): { name: string; content: string }[] {
  return [
    { name: "00-README-flow.bat", content: generateMasterBat(cfg) },
    { name: "01-setup-depot-tools.bat", content: generateSetupDepotToolsBat() },
    { name: "02-fetch-chromium.bat", content: generateFetchBat(cfg) },
    { name: "03-build-portable.bat", content: generateBuildBat(cfg) },
    { name: "04-package-portable.bat", content: generatePackageBat(cfg) },
    { name: "args.gn", content: generateGnArgs(cfg) },
  ];
}

export const FAQ = [
  {
    q: "為什麼不能直接下載「官方可攜 Chromium」？",
    a: "Google 不提供 Windows 官方 portable 安裝包。可攜版需自行用原始碼建置，或使用社群預編譯（風險自負）。本工具依官方 Windows 建置文件，引導你做出可整包移動的目錄。",
  },
  {
    q: "Release non-component 和 component 差在哪？",
    a: "component build 把程式拆成大量 DLL，連結快但散落檔案多，不利複製。可攜發佈應 is_component_build=false。",
  },
  {
    q: "mini_installer 算可攜嗎？",
    a: "mini_installer 是安裝程式產物，會寫入系統路徑。可攜模式是 chrome.exe + 相依檔 + 相對 --user-data-dir，不需安裝。",
  },
  {
    q: "建置要多久、多大？",
    a: "首次 fetch 可超過 1 小時；完整 Release 編譯常需數小時與 100GB+ 磁碟。建議 SSD、關閉對 src/out 的防毒即時掃描。",
  },
  {
    q: "可以重新分發嗎？",
    a: "Chromium 原始碼多為 BSD 類授權，但不可使用 Google Chrome 商標與圖示。分發前請自行審閱授權與法律義務。",
  },
] as const;
