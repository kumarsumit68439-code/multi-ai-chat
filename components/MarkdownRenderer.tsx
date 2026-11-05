"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[var(--border)]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 text-[11px] text-[var(--muted)]">
        <span>{lang || "code"}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto bg-black/30 px-4 py-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-black/40 border border-[var(--border)] text-xs font-mono text-[#e879f9]">
      {children}
    </code>
  );
}

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // patterns: **bold**, *italic*, `code`, ~~strike~~
  const regex = /(`[^`]+`)|\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~/g;
  let last = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[1]) {
      parts.push(<InlineCode key={key++}>{match[1].slice(1, -1)}</InlineCode>);
    } else if (match[2]) {
      parts.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++} className="italic">{match[3]}</em>);
    } else if (match[4]) {
      parts.push(<del key={key++} className="line-through opacity-60">{match[4]}</del>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

type Block =
  | { type: "code"; lang: string; code: string }
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "hr" }
  | { type: "blockquote"; text: string }
  | { type: "p"; text: string };

function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      i++;
      continue;
    }

    // headings
    if (/^### /.test(line)) { blocks.push({ type: "h3", text: line.slice(4) }); i++; continue; }
    if (/^## /.test(line))  { blocks.push({ type: "h2", text: line.slice(3) }); i++; continue; }
    if (/^# /.test(line))   { blocks.push({ type: "h1", text: line.slice(2) }); i++; continue; }

    // hr
    if (/^(---|-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // blockquote
    if (line.startsWith("> ")) {
      blocks.push({ type: "blockquote", text: line.slice(2) });
      i++;
      continue;
    }

    // unordered list
    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // empty line → skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // paragraph
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("```") && !/^#{1,3} /.test(lines[i]) && !/^[-*+] /.test(lines[i]) && !/^\d+\. /.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", text: paraLines.join("\n") });
  }

  return blocks;
}

export default function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;
  const blocks = parseBlocks(content);

  return (
    <div className="prose-sm max-w-none space-y-2 text-sm leading-relaxed">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "code":
            return <CodeBlock key={idx} code={block.code} lang={block.lang} />;
          case "h1":
            return <h1 key={idx} className="text-xl font-bold mt-4 mb-1">{parseInline(block.text)}</h1>;
          case "h2":
            return <h2 key={idx} className="text-lg font-semibold mt-3 mb-1">{parseInline(block.text)}</h2>;
          case "h3":
            return <h3 key={idx} className="text-base font-semibold mt-2 mb-0.5">{parseInline(block.text)}</h3>;
          case "hr":
            return <hr key={idx} className="border-[var(--border)] my-3" />;
          case "blockquote":
            return (
              <blockquote key={idx} className="border-l-2 border-[var(--primary)] pl-3 text-[var(--muted)] italic">
                {parseInline(block.text)}
              </blockquote>
            );
          case "ul":
            return (
              <ul key={idx} className="list-disc list-inside space-y-0.5 pl-1">
                {block.items.map((item, j) => (
                  <li key={j}>{parseInline(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="list-decimal list-inside space-y-0.5 pl-1">
                {block.items.map((item, j) => (
                  <li key={j}>{parseInline(item)}</li>
                ))}
              </ol>
            );
          case "p":
          default:
            return (
              <p key={idx} className="whitespace-pre-wrap break-words">
                {parseInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
