import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Sparkles, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { apiRegister, apiLogin } from "@/lib/api";
import { ThemeToggle } from "@/hooks/use-theme";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Criar conta · Mentora.ai" }] }),
  component: RegisterPage,
});

function formatCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

const SECURITY_QUESTIONS = [
  "Qual o nome do seu primeiro animal de estima\u00e7\u00e3o?",
  "Qual o nome da cidade onde voc\u00ea nasceu?",
  "Qual o nome do seu melhor amigo de inf\u00e2ncia?",
  "Qual a sua comida favorita da inf\u00e2ncia?",
  "Qual o modelo do seu primeiro carro?",
  "Qual o nome de solteira da sua m\u00e3e?",
];

const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, "Informe seu nome completo."),
    email: z.string().trim().min(1, "Informe seu e-mail.").email("Informe um e-mail válido."),
    username: z.string().trim().min(3, "O usuário deve ter pelo menos 3 caracteres."),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
    confirm: z.string().min(8, "Confirme sua senha."),
    cpf: z
      .string()
      .trim()
      .min(1, "Informe seu CPF.")
      .refine((value) => value.replace(/\D/g, "").length === 11, "CPF inválido."),
    security_question: z.string().min(1, "Selecione uma pergunta secreta."),
    security_answer: z.string().trim().min(2, "Digite a resposta da pergunta secreta."),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "As senhas não coincidem.",
  });

function RegisterPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      full_name: "",
      email: "",
      username: "",
      password: "",
      confirm: "",
      cpf: "",
      security_question: "",
      security_answer: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof registerSchema>) => {
    registerForm.clearErrors("root");
    try {
      await apiRegister({
        email: values.email,
        username: values.username,
        full_name: values.full_name,
        password: values.password,
        cpf: values.cpf,
        security_question: values.security_question,
        security_answer: values.security_answer,
      });
      await apiLogin(values.username, values.password);
      navigate({ to: "/dashboard" });
    } catch (error) {
      registerForm.setError("root", {
        type: "server",
        message: error instanceof Error ? error.message : "Erro ao criar conta.",
      });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-card border-r border-border">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#6366f1]/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#7c3aed]/10 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-sm">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-foreground text-xl tracking-tight">Mentora<span className="text-accent">.ai</span></span>
        </Link>

        <div className="relative space-y-8">
          <div>
            <p className="text-4xl font-bold text-[#f0f2f5] leading-tight tracking-tight">
              Comece a treinar<br />
              <span className="text-accent">entrevistas reais</span><br />
              com IA.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Simulacoes personalizadas baseadas na vaga que voce quer. Feedback em tempo real.
            </p>
          </div>

          <div className="space-y-3">
            {["5 perguntas inteligentes por sessao", "Feedback detalhado apos cada entrevista", "Historico de progresso completo"].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-[#6366f1]/20 border border-[#6366f1]/40 flex items-center justify-center shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#818cf8]" />
                </div>
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="absolute top-4 right-4 lg:hidden"><ThemeToggle /></div>
        <div className="hidden lg:flex justify-end mb-2"><ThemeToggle /></div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm mx-auto">

          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-sm">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-foreground text-xl">Mentora<span className="text-accent">.ai</span></span>
          </Link>

          <h1 className="text-3xl font-bold text-foreground tracking-tight">Criar conta</h1>
          <p className="mt-2 text-muted-foreground text-sm">Comece a treinar gratuitamente.</p>

          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(handleSubmit)} className="mt-8 space-y-4" noValidate>
              <FormField
                control={registerForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-[#8b95a7]">Nome completo</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        placeholder="Joao Silva"
                        autoComplete="name"
                        aria-invalid={!!registerForm.formState.errors.full_name}
                        className="mt-1.5 w-full rounded-xl bg-[#1e2536] border border-[#252d3d] px-4 py-3 text-sm text-[#f0f2f5] placeholder:text-[#8b95a7]/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/40 transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-[#8b95a7]">E-mail</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        type="email"
                        placeholder="voce@email.com"
                        autoComplete="email"
                        aria-invalid={!!registerForm.formState.errors.email}
                        className="mt-1.5 w-full rounded-xl bg-[#1e2536] border border-[#252d3d] px-4 py-3 text-sm text-[#f0f2f5] placeholder:text-[#8b95a7]/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/40 transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-[#8b95a7]">Usuario</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        placeholder="joaosilva"
                        autoComplete="username"
                        aria-invalid={!!registerForm.formState.errors.username}
                        className="mt-1.5 w-full rounded-xl bg-[#1e2536] border border-[#252d3d] px-4 py-3 text-sm text-[#f0f2f5] placeholder:text-[#8b95a7]/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/40 transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-[#8b95a7]">Senha</FormLabel>
                    <div className="relative mt-1.5">
                      <FormControl>
                        <input
                          {...field}
                          type={showPass ? "text" : "password"}
                          placeholder="Minimo 8 caracteres"
                          autoComplete="new-password"
                          aria-invalid={!!registerForm.formState.errors.password}
                          className="w-full rounded-xl bg-[#1e2536] border border-[#252d3d] px-4 py-3 pr-10 text-sm text-[#f0f2f5] placeholder:text-[#8b95a7]/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/40 transition-all"
                        />
                      </FormControl>
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b95a7] hover:text-[#f0f2f5] transition-colors">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-[#8b95a7]">Confirmar senha</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        type="password"
                        placeholder="Repita a senha"
                        autoComplete="new-password"
                        aria-invalid={!!registerForm.formState.errors.confirm}
                        className="mt-1.5 w-full rounded-xl bg-[#1e2536] border border-[#252d3d] px-4 py-3 text-sm text-[#f0f2f5] placeholder:text-[#8b95a7]/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/40 transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-xl bg-[#1a2035] border border-[#6366f1]/20 px-4 py-4 space-y-3">
                <p className="text-xs font-semibold text-[#6366f1] uppercase tracking-wider">Recupera\u00e7\u00e3o de senha</p>

                <FormField
                  control={registerForm.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-[#8b95a7]">CPF</FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          placeholder="000.000.000-00"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-invalid={!!registerForm.formState.errors.cpf}
                          onChange={(event) => field.onChange(formatCPF(event.target.value))}
                          className="mt-1.5 w-full rounded-xl bg-[#1e2536] border border-[#252d3d] px-4 py-3 text-sm text-[#f0f2f5] placeholder:text-[#8b95a7]/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/40 transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="security_question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-[#8b95a7]">Pergunta secreta</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          aria-invalid={!!registerForm.formState.errors.security_question}
                          className="mt-1.5 w-full rounded-xl bg-[#1e2536] border border-[#252d3d] px-4 py-3 text-sm text-[#f0f2f5] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/40 transition-all"
                        >
                          <option value="">Selecione uma pergunta\u2026</option>
                          {SECURITY_QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="security_answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-[#8b95a7]">Resposta</FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          placeholder="Sua resposta"
                          autoComplete="off"
                          aria-invalid={!!registerForm.formState.errors.security_answer}
                          className="mt-1.5 w-full rounded-xl bg-[#1e2536] border border-[#252d3d] px-4 py-3 text-sm text-[#f0f2f5] placeholder:text-[#8b95a7]/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/40 transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="mt-1 text-[11px] text-[#8b95a7]/70">Guarde bem o CPF e a resposta \u2014 ser\u00e3o usados para recuperar sua senha.</p>
                    </FormItem>
                  )}
                />
              </div>

              {registerForm.formState.errors.root?.message && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3">
                  {registerForm.formState.errors.root.message}
                </motion.p>
              )}

              <button type="submit" disabled={registerForm.formState.isSubmitting || !registerForm.formState.isValid}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3.5 text-sm font-semibold text-white shadow-glow hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 mt-2">
                {registerForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Criar conta gratis</>}
              </button>

              <p className="text-center text-sm text-muted-foreground pt-2">
                Já tem conta?{" "}
                <Link to="/login" className="text-accent hover:text-[#a5b4fc] transition-colors font-medium">Entrar</Link>
              </p>
            </form>
          </Form>
        </motion.div>
      </div>
    </div>
  );
}