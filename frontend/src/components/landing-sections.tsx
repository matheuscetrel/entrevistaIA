import { motion } from "framer-motion";
import {
  Brain, Target, MessageSquareWarning, Zap, Activity, Trophy,
  ClipboardPaste, Play, MessageCircle, Check, Sparkles, Quote,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

export function ProblemSection() {
  const items = [
    { icon: MessageSquareWarning, title: "Insegurança paralisante", text: "Você sabe a resposta, mas trava na hora H." },
    { icon: Brain, title: "Branco mental", text: "Perguntas inesperadas que você nunca treinou." },
    { icon: Target, title: "Falta prática real", text: "Estudar teoria não substitui a pressão da entrevista." },
  ];
  return (
    <section id="problema" className="relative py-32 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="max-w-2xl mb-16">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">O problema</span>
          <h2 className="mt-4 font-display text-5xl md:text-6xl leading-[1.05]">
            Você sabe que <em className="text-gradient">merece</em> a vaga.
            <br />Só não consegue mostrar isso.
          </h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="group rounded-2xl glass p-7 hover:border-primary/40 transition-all hover:-translate-y-1"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-5">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="font-medium text-lg mb-2">{it.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{it.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SolutionSection() {
  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-16 items-center">
        <motion.div {...fadeUp}>
          <span className="text-xs uppercase tracking-[0.2em] text-primary">A solução</span>
          <h2 className="mt-4 font-display text-5xl md:text-6xl leading-[1.05]">
            Uma IA que entrevista você <em className="text-gradient">como gente</em>.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Cole a vaga, comece a conversa. A Mentora analisa o cargo, gera perguntas
            específicas e te entrevista em tempo real — com voz, ritmo e pressão de uma
            entrevista de verdade.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Perguntas geradas a partir da descrição da vaga",
              "Conversação em tempo real com voz natural",
              "Feedback inteligente após cada resposta",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} className="relative">
          <div className="absolute -inset-10 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
          <div className="relative glass rounded-3xl p-8 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Análise da vaga</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                <Activity className="h-3 w-3" /> ao vivo
              </span>
            </div>
            {[
              { label: "Stack técnico", val: "React, Node, AWS" },
              { label: "Senioridade", val: "Pleno → Sênior" },
              { label: "Soft skills", val: "Liderança, comunicação" },
              { label: "Perguntas geradas", val: "12 personalizadas" },
            ].map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0"
              >
                <span className="text-sm text-muted-foreground">{r.label}</span>
                <span className="text-sm font-medium">{r.val}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function DifferentialSection() {
  const items = [
    { icon: Zap, title: "Tempo real, não chatbot", text: "Sofia responde, ouve e adapta na hora — como um humano." },
    { icon: Brain, title: "Contexto da sua vaga", text: "Entende o cargo, a empresa e o que será cobrado." },
    { icon: Trophy, title: "Pressão de verdade", text: "Simula o estresse real para você chegar pronto." },
  ];
  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">O diferencial</span>
          <h2 className="mt-4 font-display text-5xl md:text-6xl leading-[1.05]">
            Isso aqui não é <em className="text-gradient">mais um chatbot</em>.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            É a primeira IA entrevistadora que conversa com você — em voz, em ritmo, em pressão.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-primary opacity-10 blur-3xl rounded-[3rem]" />
          <div className="relative grid md:grid-cols-3 gap-px rounded-3xl overflow-hidden border border-border/60 bg-border/40">
            {items.map((it, i) => (
              <motion.div
                key={it.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                className="bg-card p-10"
              >
                <it.icon className="h-7 w-7 text-primary mb-6" strokeWidth={1.5} />
                <h3 className="font-display text-2xl mb-3">{it.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{it.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const steps = [
    { icon: ClipboardPaste, n: "01", title: "Cole a descrição da vaga", text: "Copie do LinkedIn, do site da empresa, de onde for. Em segundos a IA entende o cargo." },
    { icon: Play, n: "02", title: "Inicie a entrevista", text: "Sofia se apresenta e começa a conversa — naturalmente, com voz." },
    { icon: MessageCircle, n: "03", title: "Responda em tempo real", text: "Perguntas reais, follow-ups, pressão. Quando terminar, receba seu feedback." },
  ];
  return (
    <section id="como-funciona" className="relative py-32 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="text-center mb-20">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">Como funciona</span>
          <h2 className="mt-4 font-display text-5xl md:text-6xl">Três passos. Zero fricção.</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.15 }}
              className="relative glass rounded-2xl p-8 hover:-translate-y-1 transition-transform"
            >
              <div className="font-display text-7xl text-primary/30 leading-none mb-6">{s.n}</div>
              <s.icon className="h-6 w-6 text-primary mb-4" />
              <h3 className="font-medium text-xl mb-3">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingSection() {
  const plans = [
    {
      name: "Avulso",
      price: "19,90",
      period: "pagamento único",
      desc: "Perfeito para uma entrevista próxima.",
      features: ["3 entrevistas completas", "Feedback após cada sessão", "Voz natural em tempo real", "Acesso por 30 dias"],
      highlighted: false,
    },
    {
      name: "Ilimitado",
      price: "49,90",
      period: "por mês",
      desc: "Para quem está em processo seletivo ativo.",
      features: ["Entrevistas ilimitadas", "Feedback detalhado por skill", "Histórico completo", "Suporte prioritário", "Cancelamento a qualquer momento"],
      highlighted: true,
    },
  ];

  return (
    <section id="planos" className="relative py-32 px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div {...fadeUp} className="text-center mb-16">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">Planos</span>
          <h2 className="mt-4 font-display text-5xl md:text-6xl">Escolha como vai treinar.</h2>
          <p className="mt-5 text-lg text-muted-foreground">Sem fidelidade. Sem cartão para começar.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className={`relative rounded-3xl p-10 ${p.highlighted ? "border-gradient bg-card shadow-elevated" : "glass"}`}
            >
              {p.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-soft">
                  <Sparkles className="h-3 w-3" /> Mais popular
                </div>
              )}
              <h3 className="font-display text-3xl">{p.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-8 flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <span className="font-display text-7xl tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground ml-1">/ {p.period}</span>
              </div>

              <Link
                to="/login"
                className={`mt-8 block text-center rounded-full py-3.5 text-sm font-medium transition-all ${
                  p.highlighted
                    ? "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-soft hover:scale-[1.02]"
                    : "bg-elevated text-foreground hover:bg-secondary border border-border"
                }`}
              >
                {p.highlighted ? "Assinar Ilimitado" : "Começar agora"}
              </Link>

              <ul className="mt-8 space-y-3 border-t border-border/50 pt-8">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  const items = [
    { name: "Mariana Costa", role: "Product Designer · Loft", text: "Me senti em uma entrevista real. A pressão era a mesma. Quando entrei na de verdade, parecia déjà vu." },
    { name: "Rafael Andrade", role: "Engenheiro de Software · Nubank", text: "Treinei 5 entrevistas em uma semana. Passei na seguinte. Simples assim." },
    { name: "Camila Souza", role: "Analista de Dados · iFood", text: "O feedback é cirúrgico. Mostrou exatamente onde eu estava travando — e eu nem percebia." },
  ];
  return (
    <section id="depoimentos" className="relative py-32 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="text-center mb-16">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">Quem treinou, conquistou</span>
          <h2 className="mt-4 font-display text-5xl md:text-6xl">Mais confiança, menos sorte.</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((t, i) => (
            <motion.figure
              key={t.name}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="rounded-2xl glass p-8 flex flex-col"
            >
              <Quote className="h-6 w-6 text-primary mb-5" />
              <blockquote className="text-foreground leading-relaxed flex-1">"{t.text}"</blockquote>
              <figcaption className="mt-6 pt-6 border-t border-border/50">
                <div className="font-medium">{t.name}</div>
                <div className="text-sm text-muted-foreground">{t.role}</div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection() {
  return (
    <section className="relative py-32 px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-[2.5rem] bg-card border-gradient p-16 text-center"
        >
          <div className="absolute inset-0 bg-gradient-primary opacity-10" />
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />

          <div className="relative">
            <h2 className="font-display text-5xl md:text-7xl leading-[1.05]">
              Comece agora e <em className="text-gradient">passe</em><br />
              na sua próxima entrevista.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              Treine quantas vezes quiser. Quando o recrutador ligar, você vai estar pronto.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-4 text-base font-medium text-primary-foreground shadow-soft hover:opacity-90 hover:scale-[1.02] transition-all"
              >
                Começar agora <Sparkles className="h-4 w-4" />
              </Link>
              <a href="#planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Ver planos →
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
