import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeafIcon, MenuIcon } from "./Icons";

const items = [
  { to: "/", label: "Overview" },
  { to: "/call-history", label: "Call History" },
  { to: "/knowledge-base", label: "Knowledge Base" },
] as const;

export function TopNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3 md:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Aura Skincare home">
          <span className="grid size-10 place-items-center rounded-full bg-forest text-sage"><LeafIcon /></span>
          <span className="leading-tight">
            <span className="block font-serif text-xl text-forest">Aura Skincare</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Customer Experience</span>
          </span>
        </Link>
        <nav className="ml-10 hidden gap-1 md:flex" aria-label="Main">
          {items.map((i) => (
            <Link key={i.to} to={i.to} activeOptions={{ exact: true }}
              className="relative px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-forest after:absolute after:inset-x-4 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-amber after:transition-transform hover:after:scale-x-100"
              activeProps={{ className: "!text-forest font-semibold after:!scale-x-100" }}>
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/"
            hash="voice-assistant"
            className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-forest transition-colors hover:border-sage hover:bg-sage-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 sm:flex"
          >
            <span className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-sage animate-ripple" />
              <span className="relative size-2 rounded-full bg-sage" />
            </span>
            AI Agent Ready
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="tip grid size-10 place-items-center rounded-full border border-border bg-cream text-sm font-semibold text-forest transition-colors hover:border-sage hover:bg-sage-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
                data-tip="Support lead"
                aria-label="Open profile menu"
              >
                SL
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuLabel>Support lead</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-xs text-muted-foreground">Aura Skincare team</p>
            </DropdownMenuContent>
          </DropdownMenu>
          <button className="press grid size-10 place-items-center rounded-full border border-border md:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)}><MenuIcon /></button>
        </div>
      </div>
      <div className={`grid overflow-hidden transition-all duration-300 md:hidden ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <nav className="min-h-0" aria-label="Mobile">
          <div className="flex flex-col gap-1 px-5 pb-4">
            {items.map((i) => (
              <Link key={i.to} to={i.to} onClick={() => setOpen(false)} activeOptions={{ exact: true }}
                className="rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-cream" activeProps={{ className: "bg-sage-soft !text-forest font-semibold" }}>{i.label}</Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
