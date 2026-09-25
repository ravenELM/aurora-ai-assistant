import { motion } from "motion/react";

export function ShiningText({ text }: { text: string }) {
  return (
    <motion.span
      key={text}
      className="inline-block bg-[linear-gradient(110deg,var(--muted-foreground),35%,var(--foreground),50%,var(--muted-foreground),75%,var(--muted-foreground))] bg-[length:200%_100%] bg-clip-text text-base text-transparent"
      initial={{ backgroundPosition: "200% 0", opacity: 0 }}
      animate={{ backgroundPosition: "-200% 0", opacity: 1 }}
      transition={{
        backgroundPosition: { repeat: Infinity, duration: 2, ease: "linear" },
        opacity: { duration: 0.25 },
      }}
    >
      {text}
    </motion.span>
  );
}

const LABELS: Array<[RegExp, string]> = [
  [/calendar|event/i, "Looking at your calendar…"],
  [/gmail|mail|email/i, "Checking your email…"],
  [/drive|docs|sheet/i, "Searching your files…"],
  [/slack/i, "Checking Slack…"],
  [/notion/i, "Looking in Notion…"],
  [/github/i, "Looking at GitHub…"],
  [/image/i, "Creating your image…"],
  [/search|web|browse/i, "Searching the web…"],
  [/memor/i, "Remembering…"],
];

export function toolLabel(name: string, toolkit?: string) {
  const key = `${toolkit ?? ""} ${name}`;
  for (const [re, label] of LABELS) if (re.test(key)) return label;
  const pretty = (toolkit || name).replace(/[_-]+/g, " ").toLowerCase();
  return `Using ${pretty}…`;
}
