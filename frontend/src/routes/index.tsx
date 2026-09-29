import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { InterviewMockup } from "@/components/interview-mockup";
import {
  ProblemSection,
  SolutionSection,
  DifferentialSection,
  HowItWorksSection,
  PricingSection,
  TestimonialsSection,
  FinalCtaSection,
} from "@/components/landing-sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mentora.ai — Treine entrevistas com uma IA que age como um recrutador real" },
      { name: "description", content: "Simulações de entrevista em tempo real com IA, baseadas na vaga que você quer conquistar. Treine, receba feedback e passe na próxima entrevista." },
      { property: "og:title", content: "Mentora.ai — IA entrevistadora em tempo real" },
      { property: "og:description", content: "Treine entrevistas com uma IA que conversa, pressiona e te avalia como um recrutador real." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-24 px-6">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-3 py-1 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                IA conversacional · em tempo real
              </div>

              <h1 className="mt-6 font-display text-6xl md:text-7xl xl:text-8xl leading-[0.95] tracking-tight">
                Treine entrevistas
                <br />
                com uma IA que <em className="text-gradient">age como um recrutador real</em>.
              </h1>

              <p className="mt-7 text-lg text-muted-foreground max-w-xl leading-relaxed">
                Simulações em tempo real baseadas na vaga que você quer conquistar.
                Voz natural, perguntas inteligentes, pressão real.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  to="/login"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-4 text-base font-medium text-primary-foreground shadow-soft hover:opacity-90 hover:scale-[1.02] transition-all"
                >
                  Começar agora
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-6 py-4 text-base font-medium hover:bg-elevated transition-colors"
                >
                  <PlayCircle className="h-4 w-4 text-primary" />
                  Ver demonstração
                </a>
              </div>

              <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-7 w-7 rounded-full border-2 border-background bg-gradient-to-br from-primary to-accent"
                    />
                  ))}
                </div>
                <span>+2.400 candidatos treinando esta semana</span>
              </div>
            </motion.div>

            <div>
              <InterviewMockup />
            </div>
          </div>
        </div>
      </section>

      <ProblemSection />
      <SolutionSection />
      <DifferentialSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <FinalCtaSection />

      <SiteFooter />
    </div>
  );
}
