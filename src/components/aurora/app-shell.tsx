import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import {
  Archive,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Ellipsis,
  Folder,
  Images,
  Library,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  Plug,
  Search,
  Settings,
  Share2,
  Sparkles,
  SquarePen,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteConversation,
  listConversations,
  renameConversation,
  setConversationState,
} from "@/lib/aurora.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import auroraIcon from "@/assets/aurora-icon.png";

type Conversation = {
  id: string;
  title: string;
  pinned: boolean;
};

export function AppShell({
  children,
  activeId,
  title,
  actions,
}: {
  children: ReactNode;
  activeId?: string | null;
  title?: ReactNode;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [menuConv, setMenuConv] = useState<Conversation | null>(null);
  const [deleteConv, setDeleteConv] = useState<Conversation | null>(null);
  const [renameConv, setRenameConv] = useState<Conversation | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [account, setAccount] = useState({ name: "Aurora user", email: "" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchConversations = useServerFn(listConversations);
  const rename = useServerFn(renameConversation);
  const remove = useServerFn(deleteConversation);
  const updateState = useServerFn(setConversationState);
  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetchConversations({}),
  });

  const all = (conversations.data ?? []).filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()),
  );
  const pinned = all.filter((c) => c.pinned);
  const recents = all.filter((c) => !c.pinned);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      const name = String(user.user_metadata?.["full_name"] ?? user.email?.split("@")[0] ?? "Aurora user");
      setAccount({ name, email: user.email ?? "" });
    });
  }, []);

  const openSidebar = () => {
    setMounted(true);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setOpen(true)));
  };

  const close = () => {
    setOpen(false);
    setMenuConv(null);
    setDeleteConv(null);
    setRenameConv(null);
    setProfileOpen(false);
    window.setTimeout(() => setMounted(false), 300);
  };

  const refreshChats = () => qc.invalidateQueries({ queryKey: ["conversations"] });

  async function confirmRename() {
    const next = renameValue.trim();
    if (!renameConv || !next || next === renameConv.title) { setRenameConv(null); return; }
    setBusy(true);
    await rename({ data: { id: renameConv.id, title: next } });
    setBusy(false);
    setRenameConv(null);
    await refreshChats();
  }

  async function confirmDelete() {
    if (!deleteConv) return;
    setBusy(true);
    await remove({ data: { id: deleteConv.id } });
    setBusy(false);
    if (activeId === deleteConv.id) void navigate({ to: "/chat", search: {} });
    setDeleteConv(null);
    await refreshChats();
  }

  async function shareChat(conversation: Conversation) {
    const url = `${window.location.origin}/chat?c=${conversation.id}`;
    if (navigator.share) await navigator.share({ title: conversation.title, url });
    else { await navigator.clipboard.writeText(url); toast.success("Chat link copied"); }
    setMenuConv(null);
  }

  async function togglePin(conversation: Conversation) {
    await updateState({ data: { id: conversation.id, pinned: !conversation.pinned } });
    setMenuConv(null);
    await refreshChats();
  }

  async function archiveChat(conversation: Conversation) {
    await updateState({ data: { id: conversation.id, archived: true } });
    setMenuConv(null);
    await refreshChats();
  }

  const initials = account.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";

  const sidebar = (
    <aside className="relative flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),1rem)] md:px-5 md:pb-4 md:pt-[max(env(safe-area-inset-top),1.25rem)]">
        <img src={auroraIcon} alt="Aurora" className="size-8 object-contain md:size-9" />
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Search chats"
            onClick={() => setSearching((v) => !v)}
            className="grid size-8 place-items-center rounded-full hover:bg-sidebar-accent md:size-10"
          >
            <Search className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="grid size-8 place-items-center rounded-full hover:bg-sidebar-accent md:size-10 md:hidden"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {searching && (
        <div className="px-4 pb-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full rounded-xl bg-sidebar-accent px-3 py-2 text-[13px] outline-none placeholder:text-muted-foreground md:px-4 md:py-2.5 md:text-sm"
          />
        </div>
      )}

      <nav className="space-y-0.5 px-3 pb-2">
        <SideLink to="/chat" label="New chat" icon={SquarePen} active={pathname === "/chat" && !activeId} onClick={close} />
        <SideLink to="/images" label="Images" icon={Images} active={pathname === "/images"} onClick={close} />
        <SideLink to="/library" label="Library" icon={Library} active={pathname === "/library"} onClick={close} />
        <SideItem label="Scheduled" icon={Clock3} />
        <SideLink to="/settings" label="Plugins" icon={Plug} active={pathname === "/settings"} onClick={close} />
        <SideItem label="Projects" icon={Folder} trailing={<span className="text-lg text-muted-foreground">+</span>} />
        <SideItem label="More" icon={MoreHorizontal} onClick={() => setProfileOpen(true)} />
      </nav>

      <div className="flex-1 overflow-y-auto px-3 pb-24">
        {pinned.length > 0 && (
          <>
             <p className="px-3 pb-1 pt-3 text-xs text-muted-foreground md:pt-4 md:text-[15px]">Pinned</p>
            {pinned.map((c) => (
               <ConvLink key={c.id} conversation={c} active={activeId === c.id} onClick={close} onOpenMenu={setMenuConv} icon />
            ))}
          </>
        )}
        <p className="px-3 pb-1 pt-3 text-xs text-muted-foreground md:pt-4 md:text-[15px]">Recents</p>
        {recents.length === 0 && (
          <p className="px-3 py-2 text-sm text-muted-foreground">No chats yet</p>
        )}
        {recents.map((c) => (
          <ConvLink key={c.id} conversation={c} active={activeId === c.id} onClick={close} onOpenMenu={setMenuConv} />
        ))}
      </div>

      {profileOpen && (
        <>
          <button type="button" aria-label="Close profile menu" className="absolute inset-0 z-20" onClick={() => setProfileOpen(false)} />
          <div className="absolute bottom-20 left-4 right-4 z-30 rounded-[28px] border border-sidebar-border bg-popover p-3 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-2.5 px-2 py-2">
              <Avatar initials={initials} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{account.name}</p><p className="truncate text-xs text-muted-foreground">Free</p></div>
              <ChevronRight className="size-4" />
            </div>
            <div className="my-2 border-t border-border" />
            <ProfileLink icon={Sparkles} label="Try Plus free" />
            <ProfileLink icon={Clock3} label="Personalization" to="/settings" close={close} />
            <ProfileLink icon={UserRound} label="Profile" to="/settings" close={close} />
            <ProfileLink icon={Settings} label="Settings" to="/settings" close={close} />
            <div className="my-2 border-t border-border" />
            <ProfileLink icon={CircleHelp} label="Help" trailing />
            <button type="button" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-accent"><LogOut className="size-4" />Log out</button>
          </div>
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-sidebar via-sidebar to-transparent p-3 pt-6 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <Link to="/chat" search={{}} onClick={close} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-foreground text-sm font-medium text-background">
          <SquarePen className="size-4" />Chat
        </Link>
        <Link to="/settings" onClick={close} aria-label="Settings" className="grid size-11 shrink-0 place-items-center rounded-full bg-sidebar-accent">
          <Settings className="size-5" />
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <div className="relative hidden w-72 shrink-0 border-r border-border md:block">{sidebar}</div>

      {mounted && (
        <div className={cn("fixed inset-0 z-50 md:hidden", !open && "pointer-events-none")}>
          <button
            type="button"
            aria-label="Close menu"
            className={cn("absolute inset-0 bg-background/70 transition-opacity duration-300 motion-reduce:transition-none", open ? "opacity-100" : "opacity-0")}
            onClick={close}
          />
          <div className={cn("relative h-full w-[min(66vw,18rem)] shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none", open ? "translate-x-0" : "-translate-x-full")}>{sidebar}</div>
        </div>
      )}

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 py-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={openSidebar}
            className="grid size-11 place-items-center rounded-full md:invisible"
          >
            <Menu className="size-5" />
          </button>
          {typeof title === "string" ? <h1 className="truncate text-lg font-semibold">{title}</h1> : title}
          <div className="ml-auto flex min-w-11 justify-end">{actions}</div>
        </header>
        {children}
      </main>

      {menuConv && (
        <div className="fixed inset-0 z-[70]">
          <button type="button" aria-label="Close chat actions" className="absolute inset-0 bg-background/60" onClick={() => setMenuConv(null)} />
          <div className="absolute inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] rounded-2xl border border-border bg-popover p-1 shadow-2xl animate-scale-in md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-64 md:-translate-x-1/2 md:-translate-y-1/2">
            <p className="truncate px-2.5 pb-0.5 pt-1 text-[10px] text-muted-foreground">{menuConv.title}</p>
            <ChatAction icon={Share2} label="Share" onClick={() => void shareChat(menuConv)} />
            <ChatAction icon={Pencil} label="Rename" onClick={() => { setRenameValue(menuConv.title); setRenameConv(menuConv); setMenuConv(null); }} />
            <div className="my-1 border-t border-border" />
            <ChatAction icon={Pin} label={menuConv.pinned ? "Unpin chat" : "Pin chat"} onClick={() => void togglePin(menuConv)} />
            <ChatAction icon={Archive} label="Archive" onClick={() => void archiveChat(menuConv)} />
            <div className="my-1 border-t border-border" />
            <ChatAction icon={Trash2} label="Delete" destructive onClick={() => { setDeleteConv(menuConv); setMenuConv(null); }} />
          </div>
        </div>
      )}

      {renameConv && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-6">
          <button type="button" aria-label="Cancel rename" className="absolute inset-0 bg-background/60" onClick={() => setRenameConv(null)} />
          <div className="relative w-full max-w-sm rounded-[28px] border border-border bg-popover p-5 shadow-2xl animate-scale-in">
            <h2 className="text-lg font-semibold">Rename chat</h2>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void confirmRename(); }}
              className="mt-4 w-full rounded-2xl bg-accent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Chat name"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRenameConv(null)} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="button" disabled={busy || !renameValue.trim()} onClick={() => void confirmRename()} className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-40">Save</button>
            </div>
          </div>
        </div>
      )}

      {deleteConv && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-6">
          <button type="button" aria-label="Cancel delete" className="absolute inset-0 bg-background/60" onClick={() => setDeleteConv(null)} />
          <div className="relative w-full max-w-sm rounded-[28px] border border-border bg-popover p-5 shadow-2xl animate-scale-in">
            <h2 className="text-lg font-semibold">Delete “{deleteConv.title}”?</h2>
            <p className="mt-1 text-sm text-muted-foreground">This chat and its messages will be gone for good.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteConv(null)} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="button" disabled={busy} onClick={() => void confirmDelete()} className="rounded-full bg-destructive px-5 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-40">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConvLink({
  conversation,
  active,
  onClick,
  icon,
  onOpenMenu,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
  icon?: boolean;
  onOpenMenu: (conversation: Conversation) => void;
}) {
  return (
    <div className={cn("group flex items-center rounded-2xl transition-colors hover:bg-sidebar-accent", active && "bg-sidebar-accent")}>
      <Link to="/chat" search={{ c: conversation.id }} onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-[13.5px] md:gap-3 md:px-3 md:py-2.5 md:text-[15px]">
        {icon ? <MessageCircle className="size-4 shrink-0 md:size-5" /> : null}
        <span className="truncate">{conversation.title}</span>
      </Link>
      <button type="button" aria-label={`More options for ${conversation.title}`} onClick={() => onOpenMenu(conversation)} className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground md:size-10"><Ellipsis className="size-4 md:size-5" /></button>
    </div>
  );
}

function SideLink({ to, label, icon: Icon, active, onClick }: { to: "/chat" | "/images" | "/library" | "/settings"; label: string; icon: typeof Images; active: boolean; onClick: () => void }) {
  return <Link to={to} {...(to === "/chat" ? { search: {} } : {})} onClick={onClick} className={cn("flex items-center gap-2.5 rounded-2xl px-2.5 py-2 text-[13.5px] hover:bg-sidebar-accent md:gap-4 md:px-3 md:py-3 md:text-[17px]", active && "bg-sidebar-accent")}><Icon className="size-4 md:size-6" />{label}</Link>;
}

function SideItem({ label, icon: Icon, trailing, onClick }: { label: string; icon: typeof Images; trailing?: ReactNode; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left text-[13.5px] hover:bg-sidebar-accent md:gap-4 md:px-3 md:py-3 md:text-[17px]"><Icon className="size-4 md:size-6" /><span className="flex-1">{label}</span>{trailing}</button>;
}

function ChatAction({ icon: Icon, label, onClick, destructive }: { icon: typeof Images; label: string; onClick: () => void; destructive?: boolean }) {
  return <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-accent", destructive && "text-destructive")}><Icon className="size-3.5" />{label}</button>;
}

function ProfileLink({ icon: Icon, label, to, close, trailing }: { icon: typeof Images; label: string; to?: "/settings"; close?: () => void; trailing?: boolean }) {
  const content = <><Icon className="size-4" /><span className="flex-1">{label}</span>{trailing && <ChevronRight className="size-4" />}</>;
  if (to) return <Link to={to} onClick={close} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-accent">{content}</Link>;
  return <button type="button" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-accent">{content}</button>;
}

function Avatar({ initials }: { initials: string }) {
  return <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background md:size-10 md:text-sm">{initials}</span>;
}
