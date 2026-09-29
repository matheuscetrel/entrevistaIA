import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Sparkles, ArrowRight, Briefcase, Clock, TrendingUp, LogOut,
  Play, ChevronRight, History, Star, Zap, Target,
} from "lucide-react";
import { isAuthenticated, logout } from "@/lib/auth";
import { apiCreateInterview, apiGetStats, apiListInterviews, apiGetMe, type InterviewStats, type InterviewResponse } from "@/lib/api";
import { ThemeToggle } from "@/hooks/use-theme";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Mentora.ai" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardPage,
});

const SAMPLE = `Engenheiro de Software Pleno — focar em React, Node.js, AWS. Liderar projetos, mentorar juniores, trabalhar com sistemas distribuidos e arquitetura orientada a eventos.`;

const seniorityOptions = ["estagio", "junior", "pleno", "senior", "especialista"] as const;
const seniorityLabels: Record<(typeof seniorityOptions)[number], string> = {
  estagio: "Estágio",
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  especialista: "Especialista",
};
const seniorityToDifficulty: Record<(typeof seniorityOptions)[number], "beginner" | "intermediate" | "advanced"> = {
  estagio: "beginner",
  junior: "beginner",
  pleno: "intermediate",
  senior: "advanced",
  especialista: "advanced",
};

const interviewSchema = z.object({
  job: z.string().trim().min(5, "Descreva a vaga com pelo menos 5 caracteres."),
});

function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
  const [type, setType] = useState<"mixed" | "technical" | "behavioral">("mixed");
  const [seniority, setSeniority] = useState<(typeof seniorityOptions)[number]>("pleno");
  const [firstName, setFirstName] = useState<string>("");
  const interviewForm = useForm<z.infer<typeof interviewSchema>>({
    resolver: zodResolver(interviewSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { job: "" },
  });
  const { formState: { isSubmitting, isValid } } = interviewForm;

  useEffect(() => {
    const savedJob = sessionStorage.getItem("jobDescription") ?? "";
    const savedSeniority = sessionStorage.getItem("seniority") as (typeof seniorityOptions)[number] | null;
    const savedType = sessionStorage.getItem("interviewType") as "mixed" | "technical" | "behavioral" | null;

    if (savedJob) {
      interviewForm.setValue("job", savedJob, { shouldValidate: true, shouldDirty: true });
    }

    if (savedSeniority && seniorityOptions.includes(savedSeniority)) setSeniority(savedSeniority);
    if (savedType) setType(savedType);
  }, [interviewForm]);

  useEffect(() => {
    Promise.all([
      apiGetStats().catch(() => null),
      apiListInterviews().catch(() => []),
      apiGetMe().catch(() => null),
    ]).then(([s, i, me]) => {
      if (s) setStats(s);
      setInterviews(i as InterviewResponse[]);
      if (me?.full_name) setFirstName(me.full_name.split(" ")[0]);
      else if (me?.username) setFirstName(me.username);
    });
  }, []);

  const handleStart = async (values: z.infer<typeof interviewSchema>) => {
    if (isSubmitting) return;

    interviewForm.clearErrors("root");

    try {
      const difficulty = seniorityToDifficulty[seniority];
      const payload = {
        title: `Entrevista ${new Date().toLocaleDateString("pt-BR")}`,
        interview_type: type,
        difficulty_level: difficulty,
        seniority,
        job_role: values.job.trim().slice(0, 200),
        company_context: values.job.trim(),
      };

      const createdInterview = await apiCreateInterview(payload);

      sessionStorage.setItem("jobDescription", values.job.trim());
      sessionStorage.setItem("difficulty", difficulty);
      sessionStorage.setItem("seniority", seniority);
      sessionStorage.setItem("interviewType", type);
      sessionStorage.setItem("interviewId", String(createdInterview.id));

      navigate({ to: "/interview" });
    } catch (error) {
      interviewForm.setError("root", {
        type: "server",
        message: error instanceof Error ? error.message : "Não foi possível criar a entrevista.",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  const statCards = [
    { icon: Briefcase, label: "Entrevistas", val: stats ? String(stats.total_interviews) : "—", color: "#6366f1" },
    { icon: Clock, label: "Tempo total", val: stats ? `${stats.total_time_spent_minutes}min` : "—", color: "#818cf8" },
    { icon: TrendingUp, label: "Score medio", val: stats?.average_score != null ? stats.average_score.toFixed(1) : "—", color: "#22c55e" },
    { icon: Star, label: "Concluidas", val: stats ? String(stats.completed_interviews) : "—", color: "#f59e0b" },
  ];

  const recentInterviews = interviews.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-sm">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-foreground text-lg tracking-tight">Mentora<span className="text-accent">.ai</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {firstName && (
              <span className="text-sm text-muted-foreground px-2">{firstName}</span>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Page title */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-[#6366f1]" />
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6366f1]">Pronto para treinar?</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Sua proxima entrevista</h1>
          <p className="mt-2 text-muted-foreground">Configure a vaga e inicie uma simulacao com a Sofia.</p>
        </motion.div>

        {/* Stats grid */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.06 }}
              className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3"
            >
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}18` }}>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
                <div className="text-xl font-bold text-foreground tabular-nums">{s.val}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main grid */}
        <div className="mt-6 grid lg:grid-cols-[1fr_340px] gap-6">

          {/* Left: new interview form */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              {/* Card header */}
              <div className="px-6 pt-5 pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#6366f1]" />
                  <h2 className="font-semibold text-foreground">Nova entrevista</h2>
                </div>
              </div>

              <Form {...interviewForm}>
                <form onSubmit={interviewForm.handleSubmit(handleStart)} className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">Tipo</label>
                      <div className="flex rounded-xl overflow-hidden border border-border">
                        {(["mixed", "technical", "behavioral"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            className={`flex-1 py-2 text-xs font-medium transition-all ${type === t ? "bg-[#6366f1] text-white" : "bg-elevated text-muted-foreground hover:text-foreground"}`}
                          >
                            {t === "mixed" ? "Misto" : t === "technical" ? "Tecnica" : "Comportamental"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">Senioridade</label>
                      <div className="grid grid-cols-2 gap-2">
                        {seniorityOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSeniority(option)}
                            className={`py-2 text-xs font-medium transition-all rounded-xl ${seniority === option ? "bg-[#6366f1] text-white" : "bg-elevated text-muted-foreground hover:text-foreground"}`}
                          >
                            {seniorityLabels[option]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={interviewForm.control}
                    name="job"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between mb-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground">Descricao da vaga</FormLabel>
                          <button type="button" onClick={() => field.onChange(SAMPLE)} className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors">
                            Usar exemplo
                          </button>
                        </div>
                        <FormControl>
                          <textarea
                            {...field}
                            placeholder="Cole aqui a descricao completa da vaga: cargo, responsabilidades, requisitos tecnicos, skills esperadas..."
                            rows={8}
                            className="w-full bg-input border border-border rounded-xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/40 transition-all resize-none leading-relaxed"
                          />
                        </FormControl>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground/60">{field.value.length} caracteres {field.value.trim().length < 5 ? "· minimo 5" : ""}</span>
                          <span className={`text-xs font-medium ${field.value.trim().length >= 5 ? "text-[#22c55e]" : "text-muted-foreground/60"}`}>
                            {field.value.trim().length >= 5 ? "Pronto!" : ""}
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {interviewForm.formState.errors.root && (
                    <p className="text-sm font-medium text-destructive">
                      {interviewForm.formState.errors.root.message}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3.5 text-sm font-semibold text-white shadow-glow hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isSubmitting ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Processando...</span> : <><Play className="h-4 w-4" />Iniciar entrevista com Sofia<ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
              </Form>
            </div>
          </motion.div>

          {/* Right: history */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
            <div className="rounded-2xl bg-card border border-border overflow-hidden h-full">
              <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold text-foreground">Historico</h2>
                </div>
                {recentInterviews.length > 0 && (
                  <span className="text-xs text-muted-foreground">{recentInterviews.length} sessoes</span>
                )}
              </div>

              {recentInterviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-elevated flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhuma entrevista ainda</p>
                  <p className="text-xs text-muted-foreground/60">Sua primeira sessao aparecera aqui</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentInterviews.map((iv) => (
                    <div key={iv.id} className="px-6 py-4 flex items-center gap-3 hover:bg-elevated/50 transition-colors">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${iv.status === "completed" ? "bg-[#22c55e]" : iv.status === "in_progress" ? "bg-[#6366f1] animate-pulse" : "bg-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{iv.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(iv.created_at).toLocaleDateString("pt-BR")} · {iv.interview_type}
                        </p>
                      </div>
                      {iv.overall_score != null && (
                        <div className="shrink-0 rounded-lg bg-elevated px-2.5 py-1">
                          <span className="text-xs font-bold" style={{ color: iv.overall_score >= 70 ? "#22c55e" : iv.overall_score >= 50 ? "#f59e0b" : "#ef4444" }}>
                            {iv.overall_score}
                          </span>
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Tips row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 grid sm:grid-cols-3 gap-3">
          {[ 
            { title: "Seja especifico", desc: "Dê exemplos concretos com numeros e impacto real.", emoji: "🎯" },
            { title: "Estruture bem", desc: "Use a metodologia STAR: Situacao, Tarefa, Acao, Resultado.", emoji: "⚡" },
            { title: "Fique tranquilo", desc: "A Sofia e adaptativa. Responda com naturalidade.", emoji: "🧘" },
          ].map((tip) => (
            <div key={tip.title} className="rounded-2xl bg-card border border-border px-5 py-4 flex gap-3">
              <span className="text-xl shrink-0">{tip.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}