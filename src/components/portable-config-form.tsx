import type { ReactNode } from "react";
import type { PortableConfig } from "@/lib/chromium-data";
import { cn } from "@/lib/utils";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-fg-subtle">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

export function PortableConfigForm({
  value,
  onChange,
}: {
  value: PortableConfig;
  onChange: (next: PortableConfig) => void;
}) {
  function patch(partial: Partial<PortableConfig>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Chromium src 路徑" hint="fetch 完成後的 src 目錄">
        <input
          className={inputClass}
          value={value.srcRoot}
          onChange={(e) => patch({ srcRoot: e.target.value })}
          spellCheck={false}
        />
      </Field>
      <Field label="GN 輸出目錄（相對 src）">
        <input
          className={inputClass}
          value={value.outDir}
          onChange={(e) => patch({ outDir: e.target.value })}
          spellCheck={false}
        />
      </Field>
      <Field label="可攜打包目標路徑">
        <input
          className={inputClass}
          value={value.packageDir}
          onChange={(e) => patch({ packageDir: e.target.value })}
          spellCheck={false}
        />
      </Field>
      <Field label="target_cpu">
        <select
          className={cn(inputClass, "appearance-none")}
          value={value.targetCpu}
          onChange={(e) =>
            patch({ targetCpu: e.target.value as PortableConfig["targetCpu"] })
          }
        >
          <option value="x64">x64</option>
          <option value="x86">x86</option>
          <option value="arm64">arm64</option>
        </select>
      </Field>
      <Field label="symbol_level" hint="0 = 最小體積、最快連結（可攜建議）">
        <select
          className={cn(inputClass, "appearance-none")}
          value={value.symbolLevel}
          onChange={(e) =>
            patch({
              symbolLevel: Number(e.target.value) as PortableConfig["symbolLevel"],
            })
          }
        >
          <option value={0}>0 — none</option>
          <option value={1}>1 — minimal</option>
          <option value={2}>2 — full</option>
        </select>
      </Field>
      <div className="flex flex-col justify-end gap-3 sm:col-span-1">
        <label className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-bg-elevated px-3 py-3 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={value.isOfficialBuild}
            onChange={(e) => patch({ isOfficialBuild: e.target.checked })}
          />
          <span>
            <span className="font-medium text-fg">is_official_build</span>
            <span className="mt-0.5 block text-xs text-fg-subtle">
              更激進最佳化，編譯更久
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
