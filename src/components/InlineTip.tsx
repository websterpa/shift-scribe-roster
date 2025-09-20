import React from "react";

export default function InlineTip({
  children,
  id
}: { children: React.ReactNode; id?: string }) {
  return (
    <div
      id={id}
      className="mt-1 text-xs text-muted-foreground flex items-start gap-1"
      role="note"
      aria-live="polite"
    >
      <span className="mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] leading-none">i</span>
      <span>{children}</span>
    </div>
  );
}