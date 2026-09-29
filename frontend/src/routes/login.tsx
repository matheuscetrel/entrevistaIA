import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Sparkles, ArrowRight, Loader2, Eye, EyeOff, KeyRound, X } from "lucide-react";
import { login } from "@/lib/auth";
import { apiGetSecurityQuestion, apiResetPassword } from "@/lib/api";
import { ThemeToggle } from "@/hooks/use-theme";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

function formatCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

const loginSchema = z.object({
  emailOrUsername: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail ou usuário.")
    .refine(
      (value) => {
        const normalized = value.trim();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length >= 3;
      },
      {
        message: "Informe um e-mail válido ou um usuário com pelo menos 3 caracteres.",
      },
    ),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

const forgotEmailSchema = z.object({
  email: z.string().trim().min(1, "Informe seu e-mail.").email("Informe um e-mail válido."),
});

const forgotResetSchema = z.object({
  answer: z.string().trim().min(1, "Informe a resposta da pergunta secreta."),
  cpf: z
    .string()
    .trim()
    .min(1, "Informe seu CPF.")
    .refine((value) => value.replace(/\D/g, "").length === 11, "CPF inválido."),
  newPassword: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres."),
});

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar · Mentora.ai" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotQuestion, setForgotQuestion] = useState("");
  const [forgotShowPass, setForgotShowPass] = useState(false);
  const [forgotErr, setForgotErr] = useState("");

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      emailOrUsername: "",
      password: "",
    },
  });

  const forgotEmailForm = useForm<z.infer<typeof forgotEmailSchema>>({
    resolver: zodResolver(forgotEmailSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const forgotResetForm = useForm<z.infer<typeof forgotResetSchema>>({
    resolver: zodResolver(forgotResetSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      answer: "",
      cpf: "",
      newPassword: "",
    },
  });

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotStep(1);
    setForgotEmail("");
    setForgotQuestion("");
    setForgotErr("");
    forgotEmailForm.reset();
    forgotResetForm.reset();
  };

  const handleForgotStep1 = async (values: z.infer<typeof forgotEmailSchema>) => {
    if (forgotEmailForm.formState.isSubmitting) return;

    setForgotErr("");
    forgotEmailForm.clearErrors("root");

    try {
      const response = await apiGetSecurityQuestion(values.email.trim());
      setForgotEmail(values.email.trim());
      setForgotQuestion(response.security_question);
      setForgotStep(2);
    } catch (error) {
      const message = error instanceof Error ? error.message : "E-mail não encontrado.";
      setForgotErr(message);
      forgotEmailForm.setError("root", {
        type: "server",
        message,
      });
    }
  };

  const handleForgotStep2 = async (values: z.infer<typeof forgotResetSchema>) => {
    if (forgotResetForm.formState.isSubmitting) return;

    setForgotErr("");
    forgotResetForm.clearErrors("root");

    try {
      await apiResetPassword(forgotEmail, values.cpf, values.answer.trim(), values.newPassword);
      setForgotStep(3);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao redefinir senha.";
      setForgotErr(message);
      forgotResetForm.setError("root", {
        type: "server",
        message,
      });
    }
  };

  const handleLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    if (loginForm.formState.isSubmitting) return;

    loginForm.clearErrors("root");

    try {
      await login(values.emailOrUsername.trim(), values.password);
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Credenciais inválidas.";
      loginForm.setError("root", {
        type: "server",
        message,
      });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
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

        <div className="relative space-y-6">
          <p className="text-4xl font-bold text-foreground leading-tight tracking-tight">
            "Treinei 5 vezes<br />na Mentora. <span className="text-[#818cf8]">Passei na sexta</span> — de verdade."
          </p>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-white">R</div>
            <div>
              <p className="text-sm font-semibold text-foreground">Rafael A.</p>
              <p className="text-xs text-muted-foreground">Engenheiro de Software · Nubank</p>
            </div>
          </div>
        </div>
      </div>

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

          <h1 className="text-3xl font-bold text-foreground tracking-tight">Bem-vindo de volta.</h1>
          <p className="mt-2 text-muted-foreground text-sm">Entre para continuar seus treinos.</p>

          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="mt-8 space-y-4" noValidate>
              <FormField
                control={loginForm.control}
                name="emailOrUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email ou usuário</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        placeholder="admin"
                        autoComplete="username"
                        aria-invalid={!!loginForm.formState.errors.emailOrUsername}
                        onChange={(event) => {
                          field.onChange(event);
                          if (loginForm.formState.errors.root) loginForm.clearErrors("root");
                        }}
                        className="mt-1.5 w-full rounded-xl bg-input border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/40 transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha</FormLabel>
                    <div className="relative mt-1.5">
                      <FormControl>
                        <input
                          {...field}
                          type={showPass ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          aria-invalid={!!loginForm.formState.errors.password}
                          onChange={(event) => {
                            field.onChange(event);
                            if (loginForm.formState.errors.root) loginForm.clearErrors("root");
                          }}
                          className="w-full rounded-xl bg-input border border-border px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/40 transition-all"
                        />
                      </FormControl>
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex justify-end mt-1.5">
                      <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-accent hover:text-[#a5b4fc] transition-colors">
                        Esqueceu a senha?
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {loginForm.formState.errors.root?.message && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3">
                  {loginForm.formState.errors.root.message}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loginForm.formState.isSubmitting || !loginForm.formState.isValid}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3.5 text-sm font-semibold text-white shadow-glow hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 mt-2"
              >
                {loginForm.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" /> Entrar
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Nao tem conta?{" "}
                  <Link to="/register" className="text-accent hover:text-[#a5b4fc] transition-colors font-medium">
                    Criar conta
                  </Link>
                </p>
              </div>
            </form>
          </Form>
        </motion.div>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeForgot} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.2 }} className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl">
            <button type="button" onClick={closeForgot} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
            <div className="flex gap-1.5 mb-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${forgotStep >= s ? "bg-[#6366f1]" : "bg-border"}`} />
              ))}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-foreground">
                {forgotStep === 1 && "Recuperar senha"}
                {forgotStep === 2 && "Verificar identidade"}
                {forgotStep === 3 && "Senha redefinida!"}
              </h2>
            </div>
            {forgotStep === 1 && (
              <Form {...forgotEmailForm}>
                <form onSubmit={forgotEmailForm.handleSubmit(handleForgotStep1)} className="space-y-3" noValidate>
                  <p className="text-sm text-muted-foreground">Informe o e-mail cadastrado.</p>
                  <FormField
                    control={forgotEmailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <input
                            {...field}
                            type="email"
                            placeholder="seu@email.com"
                            autoComplete="email"
                            aria-invalid={!!forgotEmailForm.formState.errors.email}
                            onChange={(event) => {
                              field.onChange(event);
                              if (forgotErr) setForgotErr("");
                              if (forgotEmailForm.formState.errors.root) forgotEmailForm.clearErrors("root");
                            }}
                            className="w-full rounded-xl bg-input border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 transition-all"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {forgotErr && <p className="text-sm text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3">{forgotErr}</p>}
                  <button type="submit" disabled={forgotEmailForm.formState.isSubmitting || !forgotEmailForm.formState.isValid} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60">
                    {forgotEmailForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
                  </button>
                </form>
              </Form>
            )}
            {forgotStep === 2 && (
              <Form {...forgotResetForm}>
                <form onSubmit={forgotResetForm.handleSubmit(handleForgotStep2)} className="space-y-3" noValidate>
                  <p className="text-sm text-muted-foreground">Confirme sua identidade para redefinir a senha.</p>
                  <div className="rounded-xl bg-[#1a2035] border border-[#6366f1]/20 px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">Pergunta secreta</p>
                    <p className="text-sm text-foreground font-medium">{forgotQuestion}</p>
                  </div>

                  <FormField
                    control={forgotResetForm.control}
                    name="answer"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <input
                            {...field}
                            type="text"
                            placeholder="Resposta da pergunta secreta"
                            autoComplete="off"
                            aria-invalid={!!forgotResetForm.formState.errors.answer}
                            onChange={(event) => {
                              field.onChange(event);
                              if (forgotErr) setForgotErr("");
                              if (forgotResetForm.formState.errors.root) forgotResetForm.clearErrors("root");
                            }}
                            className="w-full rounded-xl bg-input border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 transition-all"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={forgotResetForm.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <input
                            {...field}
                            type="text"
                            placeholder="CPF (000.000.000-00)"
                            inputMode="numeric"
                            autoComplete="off"
                            aria-invalid={!!forgotResetForm.formState.errors.cpf}
                            onChange={(event) => {
                              const formatted = formatCPF(event.target.value);
                              field.onChange(formatted);
                              if (forgotErr) setForgotErr("");
                              if (forgotResetForm.formState.errors.root) forgotResetForm.clearErrors("root");
                            }}
                            className="w-full rounded-xl bg-input border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 transition-all"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={forgotResetForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <div className="relative">
                          <FormControl>
                            <input
                              {...field}
                              type={forgotShowPass ? "text" : "password"}
                              placeholder="Nova senha (mín. 8 caracteres)"
                              autoComplete="new-password"
                              aria-invalid={!!forgotResetForm.formState.errors.newPassword}
                              onChange={(event) => {
                                field.onChange(event);
                                if (forgotErr) setForgotErr("");
                                if (forgotResetForm.formState.errors.root) forgotResetForm.clearErrors("root");
                              }}
                              className="w-full rounded-xl bg-input border border-border px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 transition-all"
                            />
                          </FormControl>
                          <button type="button" onClick={() => setForgotShowPass(!forgotShowPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {forgotShowPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {forgotErr && <p className="text-sm text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3">{forgotErr}</p>}
                  <button type="submit" disabled={forgotResetForm.formState.isSubmitting || !forgotResetForm.formState.isValid} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60">
                    {forgotResetForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redefinir senha"}
                  </button>
                </form>
              </Form>
            )}
            {forgotStep === 3 && (
              <div className="text-center py-4 space-y-4">
                <div className="mx-auto h-14 w-14 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                  <KeyRound className="h-6 w-6 text-[#22c55e]" />
                </div>
                <p className="text-sm text-muted-foreground">Senha redefinida com sucesso. Faça login com sua nova senha.</p>
                <button type="button" onClick={closeForgot} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-semibold text-white hover:opacity-90 transition-all">
                  Ir para o login
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
