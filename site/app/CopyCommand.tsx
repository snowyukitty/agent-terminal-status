"use client";

import { useState } from "react";

type CopyCommandProps = {
  command: string;
  label: string;
  copiedText?: string;
  copyText?: string;
};

export function CopyCommand({
  command,
  label,
  copiedText = "Copied",
  copyText = "Copy",
}: CopyCommandProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="command-block">
      <span className="command-prompt" aria-hidden="true">
        $
      </span>
      <code aria-label={label}>{command}</code>
      <button type="button" onClick={copy} aria-live="polite">
        {copied ? copiedText : copyText}
      </button>
    </div>
  );
}
