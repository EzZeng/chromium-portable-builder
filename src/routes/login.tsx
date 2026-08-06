import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-[calc(100dvh-var(--grok-banner-h,0px))] place-items-center bg-bg px-4 py-10 text-fg">
      <div className="w-full max-w-sm space-y-5 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-6 shadow-[var(--shadow-panel)]">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg">
            <Package className="size-4 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">登入</h1>
            <p className="text-xs text-fg-subtle">Chromium Portable Builder</p>
          </div>
        </div>
        {authEnabled ? (
          <div className="space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                使用 {p.label} 繼續
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">目前已關閉登入功能。</p>
        )}
        <Link
          to="/"
          className="block text-center text-xs text-fg-subtle hover:text-fg"
        >
          返回首頁
        </Link>
      </div>
    </main>
  );
}
