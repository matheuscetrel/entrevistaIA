import { Sparkles } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 mt-32">
      <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl">Mentora.ai</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Mentora.ai · Treine com inteligência. Conquiste com confiança.
        </p>
      </div>
    </footer>
  );
}
