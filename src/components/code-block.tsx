import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard, downloadTextFile } from "@/lib/utils";

export function CodeBlock({
  code,
  label,
  filename,
  language = "batch",
}: {
  code: string;
  label?: string;
  filename?: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await copyToClipboard(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="max-w-full min-w-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-code-bg">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          {label ? (
            <p className="truncate text-xs font-medium text-fg-muted">{label}</p>
          ) : null}
          <p className="font-mono-tab text-[11px] text-fg-subtle">{language}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {filename ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => downloadTextFile(filename, code)}
              aria-label={`Download ${filename}`}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">下載</span>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={onCopy}
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="size-3.5 text-success" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span className="hidden sm:inline">{copied ? "已複製" : "複製"}</span>
          </Button>
        </div>
      </div>
      <pre className="max-h-[min(420px,50vh)] max-w-full overflow-x-auto p-3 text-[12px] leading-relaxed text-fg-muted sm:text-[13px]">
        <code className="font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}
