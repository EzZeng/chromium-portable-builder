# Chromium Portable Builder

Windows 可攜版 Chromium 工具：一鍵用官方預編譯打包成 portable，或依 [Chromium Windows 建置說明](https://chromium.googlesource.com/chromium/src/+/main/docs/windows_build_instructions.md) 從源碼建置。

## 最快拿到 Portable（約 2 分鐘）

1. 開啟網站 → **取得 Portable**
2. 下載 `ChromiumPortable-Setup.bat`
3. 在 **Windows** 上雙擊執行  
   → 從 Google CDN 下載 Chrome for Testing / Chromium Snapshot  
   → 解壓到 `App\`，設定寫入 `Data\`  
   → 產生 `ChromiumPortable.bat`

完成後：

```text
C:\PortableChromium\
├── ChromiumPortable.bat
├── App\chrome.exe
└── Data\          # --user-data-dir（可攜設定）
```

整包可拷到 USB 或其他 PC，無需安裝。

## 功能

| 分頁 | 說明 |
| --- | --- |
| 取得 Portable | 官方預編譯 + 自動打包腳本（推薦） |
| 從源碼建置 | 7 步指南 + 檢查清單（depot_tools → gn → autoninja） |
| 源碼腳本 | `args.gn` 與批次檔產生器 |
| 常見問題 | 授權、component build、為什麼沒有官方 portable |

## 開發

```bash
npm install
npm run dev      # http://0.0.0.0:8080
npm run build
npm run typecheck
```

Stack: React 19 · TanStack Start · Vite · Tailwind v4 · Better Auth

## 授權與注意

- 本 repo 的網站／腳本：請依你自己的授權選擇分發
- Chromium / Chrome for Testing 二進位有各自授權；**不是** Google Chrome 產品下載頁
- 重新分發時請遵守開源授權，**勿使用 Chrome 商標與圖示**

## 來源

- [Windows build instructions](https://chromium.googlesource.com/chromium/src/+/main/docs/windows_build_instructions.md)
- [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/)
- [Download Chromium snapshots](https://www.chromium.org/getting-involved/download-chromium/)
