import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  CheckCircle2, TrendingUp, MessageSquare, ArrowRight,
  Star, Repeat2, ChevronRight, Sparkles,
} from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { apiListInterviews, apiGetStats, type InterviewResponse, type InterviewStats } from "@/lib/api";
import { ThemeToggle } from "@/hooks/use-theme";

export const Route = createFileRoute("/feedback")({
  head: () => ({ meta: [{ title: "Feedback · Mentora.ai" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: FeedbackPage,
});

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function FeedbackPage() {
  const navigate = useNavigate();
  const [interview, setInterview] = useState<InterviewResponse | null>(null);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiListInterviews().catch(() => []),
      apiGetStats().catch(() => null),
    ]).then(([interviews, s]) => {
      const sorted = (interviews as InterviewResponse[]).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setInterview(sorted[0] ?? null);
      if (s) setStats(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Gerando seu feedback...</p>
        </div>
      </div>
    );
  }

  const score = interview?.overall_score ?? null;
  const totalScore = score ?? 0;

  const categories = [
    { label: "Comunicacao", score: interview?.communication_score ?? null, icon: MessageSquare, color: "#818cf8" },
    { label: "Tecnico", score: interview?.technical_score ?? null, icon: TrendingUp, color: "#6366f1" },
    { label: "Geral", score: interview?.overall_score ?? null, icon: Star, color: "#22c55e" },
  ];

  const feedbackItems = score == null ? [
    "Complete uma entrevista para receber seu feedback detalhado.",
  ] : score >= 80 ? [
    "Excelente clareza nas respostas — voce comunica bem suas ideias.",
    "Boa estruturacao das respostas com exemplos praticos.",
    "Demonstrou confianca e conhecimento tecnico solido.",
  ] : score >= 60 ? [
    "Boas respostas mas pode aprofundar mais os exemplos praticos.",
    "Tente usar a metodologia STAR: Situacao, Tarefa, Acao, Resultado.",
    "Sua comunicacao e boa — trabalhe na objetividade.",
  ] : [
    "Foque em estruturar melhor suas respostas com exemplos concretos.",
    "Prepare casos reais do seu historico profissional.",
    "Treine mais vezes — cada sessao melhora seu desempenho.",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-sm">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-foreground text-lg tracking-tight">Mentora<span className="text-accent">.ai</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Dashboard <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22c55e]/15 border border-[#22c55e]/30 mb-4">
            <CheckCircle2 className="h-8 w-8 text-[#22c55e]" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Entrevista concluída!</h1>
          <p className="mt-2 text-muted-foreground">
            {interview ? `${interview.title} · ${new Date(interview.created_at).toLocaleDateString("pt-BR")}` : "Veja seu desempenho abaixo"}
          </p>
        </motion.div>

        {/* Score + categories */}
        <div className="grid sm:grid-cols-2 gap-5 mb-6">
          {/* Main score */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl bg-card border border-border p-6 flex items-center gap-6">
            <ScoreRing score={totalScore} size={96} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Score geral</p>
              <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{score ?? "—"}<span className="text-lg text-muted-foreground font-normal">/100</span></p>
              <p className="text-sm text-muted-foreground mt-1">
                {score == null ? "Sem score" : score >= 80 ? "Excelente!" : score >= 60 ? "Bom trabalho" : "Continue treinando"}
              </p>
            </div>
          </motion.div>

          {/* Category scores */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl bg-card border border-border p-6 space-y-4">
            {categories.map((c) => (
              <div key={c.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <c.icon className="h-3.5 w-3.5" style={{ color: c.color }} />
                    <span className="text-foreground font-medium">{c.label}</span>
                  </div>
                  <span className="font-bold tabular-nums" style={{ color: c.color }}>{c.score ?? "—"}</span>
                </div>
                <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${c.score ?? 0}%` }}
                    transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{ background: c.color }}
                  />
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Feedback items */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl bg-card border border-border p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#6366f1]" />
            Feedback da Sofia
          </h2>
          <div className="space-y-3">
            {feedbackItems.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
                className="flex gap-3 p-3 rounded-xl bg-elevated border border-border">
                <div className="h-5 w-5 rounded-full bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                </div>
                <p className="text-sm text-foreground leading-relaxed">{item}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats row */}
        {stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total de sessoes", val: stats.total_interviews },
              { label: "Concluidas", val: stats.completed_interviews },
              { label: "Score medio", val: stats.average_score?.toFixed(1) ?? "—" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-card border border-border px-4 py-4 text-center">
                <div className="text-2xl font-bold text-foreground tabular-nums">{s.val}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-7 py-3.5 text-sm font-semibold text-white shadow-glow hover:opacity-90 active:scale-95 transition-all"
          >
            <Repeat2 className="h-4 w-4" />
            Treinar novamente
          </button>
          <Link to="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-card border border-border px-7 py-3.5 text-sm font-semibold text-foreground hover:bg-elevated transition-all">
            Ver dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
