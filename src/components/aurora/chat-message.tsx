import { Fragment, useState } from "react";
import type React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Paperclip } from "lucide-react";
import { ToolCall } from "@/components/assistant-ui/elements/tool-call";
import { MessageActions, type Reaction } from "@/components/assistant-ui/elements/message-actions";
import { cn } from "@/lib/utils";

export type Source = { n: number; title: string; url: string; domain: string; icon: string; snippet?: string };

function SourceChip({ nums, sources }: { nums: number[]; sources: Source[] }) {
  const [open, setOpen] = useState(false);
  const list = nums.map((n) => sources.find((s) => s.n === n)).filter((s): s is Source => Boolean(s));
  const first = list[0];
  if (!first) return null;
  const name = first.domain.split(".").slice(-2, -1)[0] ?? first.domain;
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-1 inline-flex items-center gap-1 rounded-full bg-foreground/10 py-0.5 pl-1 pr-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-foreground/15 hover:text-foreground"
      >
        <img src={first.icon || `https://www.google.com/s2/favicons?domain=${first.domain}&sz=64`} alt="" className="size-3.5 rounded-full bg-background" />
        <span className="max-w-24 truncate uppercase">{name}</span>
        {list.length > 1 && <span className="opacity-70">+{list.length - 1}</span>}
      </button>
      {open && (
        <span className="absolute left-0 top-full z-30 mt-1 block w-64 animate-scale-in space-y-1 rounded-2xl border border-border bg-popover p-2 shadow-2xl">
          {list.map((s) => (
            <a key={s.n} href={s.url} target="_blank" rel="noreferrer" className="block rounded-xl px-2 py-1.5 hover:bg-foreground/5">
              <span className="block truncate text-xs text-muted-foreground">{s.domain}</span>
              <span className="line-clamp-2 block text-[13px] leading-snug text-foreground">{s.title}</span>
            </a>
          ))}
        </span>
      )}
    </span>
  );
}

const CITE = /((?:\[\d{1,2}\])+)/g;

function withCitations(children: React.ReactNode, sources: Source[]): React.ReactNode {
  if (!sources.length) return children;
  const walk = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") {
      const parts = node.split(CITE);
      if (parts.length === 1) return node;
      return parts.map((part, i) =>
        i % 2 === 1 ? (
          <SourceChip key={i} nums={[...part.matchAll(/\d+/g)].map((m) => Number(m[0]))} sources={sources} />
        ) : (
          part
        ),
      );
    }
    if (Array.isArray(node)) return node.map((c, i) => <Fragment key={i}>{walk(c)}</Fragment>);
    return node;
  };
  return walk(children);
}

function Markdown({ text, streaming, sources = [] }: { text: string; streaming: boolean; sources?: Source[] }) {
  return (
    <div
      className={cn(
        "text-[15px] leading-relaxed text-foreground",
        streaming && "after:ml-1 after:inline-block after:size-2 after:animate-pulse after:rounded-full after:bg-foreground/60 after:content-['']",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{withCitations(children, sources)}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{withCitations(children, sources)}</li>,
          h1: ({ children }) => <h1 className="mt-4 mb-2 text-lg font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-4 mb-2 text-base font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-3 mb-1.5 text-[15px] font-semibold">{children}</h3>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const isBlock = /language-/.test(className ?? "");
            return isBlock ? (
              <code className="block overflow-x-auto rounded-xl border border-border bg-foreground/5 p-3 text-[13px]">{children}</code>
            ) : (
              <code className="rounded-md bg-foreground/10 px-1.5 py-0.5 text-[13px]">{children}</code>
            );
          },
          pre: ({ children }) => <pre className="my-2">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">{children}</blockquote>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>
          ),
          th: ({ children }) => <th className="border border-border bg-foreground/5 px-2 py-1 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
          hr: () => <hr className="my-3 border-border" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export type ToolEvent = {
  id: string;
  name: string;
  toolkit: string;
  input: unknown;
  output?: unknown | undefined;
  error?: string | undefined;
  running: boolean;
};

export type ChatAttachment = {
  name: string;
  mime: string;
  kind?: string | undefined;
  url?: string | undefined;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null | undefined;
  attachments?: ChatAttachment[] | undefined;
  tools?: ToolEvent[] | undefined;
  sources?: Source[] | undefined;
  streaming?: boolean | undefined;
};

const short = (value: unknown, max = 600) => {
  const text =
    typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2);
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

export function MessageRow({
  message,
  onRegenerate,
}: {
  message: ChatMessage;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<Reaction>(null);
  const [openTool, setOpenTool] = useState<string | null>(null);

  if (message.role === "user") {
    const hasAttachments = (message.attachments ?? []).length > 0;
    if (!message.content && !hasAttachments) return null;
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-3xl rounded-br-lg bg-foreground/10 px-4 py-2.5 text-[15px] leading-relaxed text-foreground">
          {hasAttachments && (
            <div className="mb-1.5 flex max-w-sm flex-wrap justify-end gap-2">
              {message.attachments!.map((a, i) =>
                a.kind === "image" && a.url ? (
                  <img
                    key={i}
                    src={a.url}
                    alt={a.name}
                    className="max-h-44 rounded-xl object-cover"
                  />
                ) : (
                  <span
                    key={i}
                    className="flex max-w-52 items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    <Paperclip className="size-3 shrink-0" />
                    <span className="truncate">{a.name}</span>
                  </span>
                ),
              )}
            </div>
          )}
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">

      {message.imageUrl && (
        <img
          src={message.imageUrl}
          alt="Generated by Aurora"
          className="max-w-sm rounded-2xl border border-border"
        />
      )}

      {message.content && (
        <Markdown text={message.content} streaming={Boolean(message.streaming)} sources={message.sources ?? []} />
      )}

      {!message.streaming && message.content && (
        <MessageActions
          copied={copied}
          reaction={reaction}
          regenerating={false}
          onCopy={() => {
            void navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          onReactionChange={setReaction}
          onRegenerate={() => onRegenerate?.()}
          onMore={() => undefined}
        />
      )}
    </div>
  );
}
