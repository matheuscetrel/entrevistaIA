import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/hooks/use-theme";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="absolute inset-0 backdrop-blur-xl bg-background/80 border-b border-border" />
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-sm">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight">
            Mentora<span className="text-accent">.ai</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="/#problema" className="hover:text-foreground transition-colors">Problema</a>
          <a href="/#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
          <a href="/#planos" className="hover:text-foreground transition-colors">Planos</a>
          <a href="/#depoimentos" className="hover:text-foreground transition-colors">Depoimentos</a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2">
            Entrar
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-white shadow-glow-sm hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.99]"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}

