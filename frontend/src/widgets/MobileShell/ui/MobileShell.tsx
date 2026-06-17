import * as React from "react";
import { cn } from "@/shared/lib/cn";

interface MobileShellProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function MobileShell({ title, children, className }: MobileShellProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col border-x border-hairline bg-canvas">
      <header className="sticky top-0 z-10 border-b border-hairline bg-canvas/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-mono-sm text-ink">
            {title || "PoolWise"}
          </span>
        </div>
      </header>
      <main className={cn("flex-1 p-4", className)}>{children}</main>
    </div>
  );
}
