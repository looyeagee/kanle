import { useMemo, type MouseEvent as ReactMouseEvent } from "react";
import hljs from "highlight.js/lib/common";
import { renderMarkdown } from "@/lib/markdown";

function highlightCode(codeText: string, lang: string): string {
  const escaped = codeText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  try {
    const language = lang.toLowerCase().trim();
    if (language && language !== "plaintext" && hljs.getLanguage(language)) {
      return hljs.highlight(codeText, { language }).value;
    }
    return hljs.highlightAuto(codeText).value;
  } catch {
    return escaped;
  }
}

function enhanceCodeBlocks(html: string): string {
  if (!html || html.indexOf("<pre") === -1) return html;
  return html.replace(
    /<pre([^>]*)>([\s\S]*?)<\/pre>/gi,
    (_match, preAttrs: string, inner: string) => {
      const dataLangMatch = (preAttrs || "").match(/data-language="([^"]*)"/i);
      const codeClassMatch = inner.match(/<code[^>]*class="[^"]*language-(\w+)[^"]*"/i);
      const lang = (dataLangMatch?.[1] || codeClassMatch?.[1] || "plaintext").trim();
      const langLabel = lang === "plaintext" ? "Text" : lang.charAt(0).toUpperCase() + lang.slice(1);
      const codeMatch = inner.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
      const codeInner = codeMatch?.[1] || inner;
      const codeText = codeInner
        .replace(/<[^>]*>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      const highlighted = highlightCode(codeText, lang);
      const lineCount = codeText.split("\n").length;
      const actualLines = codeText.endsWith("\n") ? lineCount - 1 : lineCount;
      const lineNumbers = Array.from({ length: Math.max(1, actualLines) }, (_, i) => i + 1).join("\n");
      const codeTag = `<code class="hljs language-${lang}">${highlighted}</code>`;
      const preTag = `<pre class="macos-enhanced-code">${codeTag}</pre>`;
      return `<div class="macos-enhanced-pre"><div class="macos-enhanced-header"><div class="macos-traffic-lights"><span class="macos-traffic-light macos-traffic-red"></span><span class="macos-traffic-light macos-traffic-yellow"></span><span class="macos-traffic-light macos-traffic-green"></span></div><span class="macos-enhanced-lang">${langLabel}</span><button class="macos-enhanced-copy" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>复制</span></button></div><div class="macos-enhanced-body"><div class="macos-line-numbers">${lineNumbers}</div>${preTag}</div></div>`;
    }
  );
}

export default function ArticleContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const html = useMemo(() => enhanceCodeBlocks(renderMarkdown(content)), [content]);

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const copyBtn = (e.target as HTMLElement).closest(".macos-enhanced-copy") as HTMLButtonElement | null;
    if (!copyBtn) return;
    e.preventDefault();
    const wrapper = copyBtn.closest(".macos-enhanced-pre");
    const code = wrapper?.querySelector("code");
    if (!code) return;
    navigator.clipboard.writeText(code.textContent || "").then(() => {
      const label = copyBtn.querySelector("span");
      if (!label) return;
      const original = label.textContent;
      label.textContent = "已复制";
      copyBtn.style.color = "#28c840";
      setTimeout(() => {
        label.textContent = original;
        copyBtn.style.color = "";
      }, 2000);
    });
  };

  return (
    <div
      className={className}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
