import { LeafIcon } from "./Icons";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground md:px-8">
        <span className="flex items-center gap-2 font-serif text-lg text-forest"><LeafIcon className="size-4 text-sage" /> Aura Skincare</span>
        <span>Order and history data shown here is demonstration data for this preview.</span>
      </div>
    </footer>
  );
}
