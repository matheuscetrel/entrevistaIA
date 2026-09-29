import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
  Send, ChevronRight, CheckCircle2, Volume2, VolumeX, X,
  MoreVertical, Users,
} from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import sofiaImg from "@/assets/sofia-portrait.jpg";
import {
  apiCreateInterview, apiStartInterview, apiGenerateQuestion,
  apiSubmitAnswer, apiCompleteInterview, apiGetInterview,
  apiGetInterviewQuestions, type QuestionResponse,
} from "@/lib/api";

export const Route = createFileRoute("/interview")({
  head: () => ({ meta: [{ title: "Entrevista · Mentora.ai" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: InterviewPage,
});

/* ─── constants ─────────────────────────────────────── */
const MAX_QUESTIONS = 5;
// Meet-accurate palette
const M = {
  bg: "#1e1f20",
  tile: "#3c4043",
  tileActive: "#28292b",
  green: "#1ea362",
  red: "#ea4335",
  btn: "#3c4043",
  btnHover: "#4a4d51",
  text: "#e8eaed",
  muted: "#9aa0a6",
  border: "#3c4043",
  chatBg: "#202124",
  chatInput: "#303134",
  avatarSofia: "#8ab4f8",   // blue-ish — Google avatar color
};

/* ─── types ──────────────────────────────────────────── */
type CallPhase = "connecting" | "waiting" | "live" | "done";
type Msg = { role: "ai" | "user"; text: string; time: string };

/* ─── utils ──────────────────────────────────────────── */
const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function useElapsed(running: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setS(x => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return s;
}

/* ─── Voice selection ────────────────────────────────── */
function pickFeminineVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const priority = [
    (v: SpeechSynthesisVoice) => /microsoft.*francisca.*natural/i.test(v.name),
    (v: SpeechSynthesisVoice) => /microsoft.*francisca/i.test(v.name),
    (v: SpeechSynthesisVoice) => /microsoft.*maria/i.test(v.name),
    (v: SpeechSynthesisVoice) => /google.*portugu/i.test(v.name) && v.lang.startsWith("pt-BR"),
    (v: SpeechSynthesisVoice) => v.lang === "pt-BR" && /female|feminina|luciana|vitoria/i.test(v.name),
    (v: SpeechSynthesisVoice) => v.lang === "pt-BR",
    (v: SpeechSynthesisVoice) => v.lang.startsWith("pt"),
    (v: SpeechSynthesisVoice) => /zira|aria|samantha|victoria|karen/i.test(v.name),
  ];
  for (const t of priority) { const f = voices.find(t); if (f) return f; }
  return null;
}

function humanize(text: string) {
  return text
    .replace(/\bvc\b/gi, "você").replace(/\bpq\b/gi, "por que")
    .replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1")
    .replace(/([.!?])\s+/g, "$1  ");
}

/* ─── TTS hook ───────────────────────────────────────── */
function useTTS() {
  const hb = useRef<ReturnType<typeof setInterval> | null>(null);
  const startHB = useCallback(() => {
    if (hb.current) return;
    hb.current = setInterval(() => {
      if (window.speechSynthesis.speaking) { window.speechSynthesis.pause(); window.speechSynthesis.resume(); }
      else { clearInterval(hb.current!); hb.current = null; }
    }, 10000);
  }, []);
  const stopHB = useCallback(() => { if (hb.current) { clearInterval(hb.current); hb.current = null; } }, []);

  const speak = useCallback((text: string, onEnd: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) { onEnd(); return; }
    window.speechSynthesis.cancel(); stopHB();
    const utter = new SpeechSynthesisUtterance(humanize(text));
    utter.lang = "pt-BR"; utter.rate = 0.84; utter.pitch = 1.12; utter.volume = 1;
    const doSpeak = () => {
      const voice = pickFeminineVoice(window.speechSynthesis.getVoices());
      if (voice) utter.voice = voice;
      utter.onstart = () => startHB();
      utter.onend = () => { stopHB(); onEnd(); };
      utter.onerror = () => { stopHB(); onEnd(); };
      window.speechSynthesis.speak(utter);
    };
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) doSpeak();
    else window.speechSynthesis.addEventListener("voiceschanged", doSpeak, { once: true });
  }, [startHB, stopHB]);

  const cancel = useCallback(() => { if (typeof window !== "undefined") { stopHB(); window.speechSynthesis.cancel(); } }, [stopHB]);
  return { speak, cancel };
}

/* ─── STT hook (Speech-to-Text via Web Speech API) ─────── */
function useSTT(onText: (text: string, isFinal: boolean) => void) {
  const recogRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const activeRef = useRef(false);
  const accRef = useRef("");
  const supported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || activeRef.current) return;
    activeRef.current = true;
    accRef.current = "";
    const r = new SR();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      let interim = "";
      let newFinal = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) newFinal += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (newFinal) {
        accRef.current = (accRef.current + " " + newFinal).trim();
        onText(accRef.current, true);
      } else {
        onText((accRef.current + " " + interim).trim(), false);
      }
    };

    r.onend = () => {
      if (activeRef.current) {
        // Auto-restart so we keep listening continuously
        setTimeout(() => { if (activeRef.current) try { r.start(); } catch {} }, 120);
      } else {
        setListening(false);
      }
    };

    r.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        activeRef.current = false;
        setListening(false);
      }
      // "no-speech" / "aborted" are normal — onend will handle restart
    };

    recogRef.current = r;
    try { r.start(); setListening(true); } catch { activeRef.current = false; }
  }, [onText]);

  const stop = useCallback(() => {
    activeRef.current = false;
    accRef.current = "";
    try { recogRef.current?.abort(); } catch {}
    setListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    activeRef.current = false;
    try { recogRef.current?.abort(); } catch {};
  }, []);

  return { start, stop, listening, supported };
}

/* ─── Sound wave ─────────────────────────────────────── */
function SoundWave({ active, bars = 4, color = "#1ea362", gap = 2 }: { active: boolean; bars?: number; color?: string; gap?: number }) {
  return (
    <div className="flex items-end" style={{ height: 16, gap }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className={`rounded-full ${active ? "sound-bar" : ""}`}
          style={{ width: 3, backgroundColor: color, height: active ? "100%" : 3, animationDelay: `${i * 0.13}s` }} />
      ))}
    </div>
  );
}

/* ─── Meet-style circular button ────────────────────── */
function MeetBtn({
  children, onClick, label, off = false, danger = false, active = false, listening = false,
}: { children: React.ReactNode; onClick: () => void; label: string; off?: boolean; danger?: boolean; active?: boolean; listening?: boolean }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className={`relative h-14 w-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95
        ${danger ? "bg-[#ea4335] hover:bg-[#d33828] text-white"
        : listening ? "bg-[#ea4335] text-white"
        : active ? `bg-[#1ea362]/20 text-[#1ea362] hover:bg-[#1ea362]/30`
        : off ? "bg-[#ea4335]/15 text-[#ea4335] hover:bg-[#ea4335]/25"
        : "bg-[#3c4043] hover:bg-[#4a4d51] text-[#e8eaed]"}`}>
      {listening && (
        <span className="absolute inset-0 rounded-full bg-[#ea4335]/40 animate-ping" />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

/* ─── Connecting / Waiting screens ──────────────────── */
function ConnectingScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center" style={{ background: M.bg }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-7">
        <div className="relative">
          <motion.div className="absolute -inset-6 rounded-full border-2 opacity-30"
            style={{ borderColor: M.avatarSofia }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} />
          <motion.div className="absolute -inset-3 rounded-full border opacity-20"
            style={{ borderColor: M.avatarSofia }}
            animate={{ scale: [1, 1.07, 1], opacity: [0.2, 0, 0.2] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.4 }} />
          <div className="relative h-28 w-28 rounded-full overflow-hidden"
            style={{ border: `3px solid ${M.avatarSofia}` }}>
            <img src={sofiaImg} alt="Sofia" className="h-full w-full object-cover object-top" />
          </div>
        </div>
        <div className="text-center space-y-1.5">
          <p className="font-semibold text-xl" style={{ color: M.text }}>Sofia</p>
          <p className="text-sm" style={{ color: M.muted }}>Ligando...</p>
        </div>
        <div className="flex gap-2">
          {[0, 0.2, 0.4].map((d, i) => (
            <span key={i} className="h-2 w-2 rounded-full dot-1"
              style={{ background: M.avatarSofia, animation: `connecting 1.4s ease-in-out infinite ${d}s` }} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function WaitingScreen({ onJoined }: { onJoined: () => void }) {
  useEffect(() => { const t = setTimeout(onJoined, 1600); return () => clearTimeout(t); }, [onJoined]);
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center" style={{ background: M.bg }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-5">
        <div className="h-20 w-20 rounded-full overflow-hidden" style={{ border: `2px solid ${M.border}` }}>
          <img src={sofiaImg} alt="Sofia" className="h-full w-full object-cover" />
        </div>
        <p className="font-medium" style={{ color: M.text }}>Aguardando Sofia entrar...</p>
        <div className="flex gap-2">
          {[0, 0.18, 0.36].map((d, i) => (
            <span key={i} className="h-2 w-2 rounded-full"
              style={{ background: M.muted, animation: `connecting 1.4s ease-in-out infinite ${d}s` }} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────── */
function InterviewPage() {
  const navigate = useNavigate();
  const tts = useTTS();
  const [phase, setPhase] = useState<CallPhase>("connecting");
  const elapsed = useElapsed(phase === "live");

  const [messages, setMessages] = useState<Msg[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [interviewId, setInterviewId] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionResponse | null>(null);
  const [aiTyping, setAiTyping] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [currentCaption, setCurrentCaption] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const generationRef = useRef(false);

  // STT — speech-to-text
  const handleSttText = useCallback((text: string) => setInput(text), []);
  const stt = useSTT(handleSttText);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const captionRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const presentQuestion = useCallback((q: QuestionResponse) => {
    setCurrentQuestion(q);
    setQuestionCount((count) => Math.max(count, q.order_number));
    presentText(q.question_text);
  }, []);

  const initializeInterview = useCallback(async () => {
    if (generationRef.current) return;

    generationRef.current = true;
    setInitError(null);
    setAiTyping(true);

    try {
      const jd = typeof window !== "undefined" ? sessionStorage.getItem("jobDescription") ?? "" : "";
      const existingInterviewId = typeof window !== "undefined" ? Number(sessionStorage.getItem("interviewId") ?? "") : 0;
      const savedSeniority = (typeof window !== "undefined" ? sessionStorage.getItem("seniority") : "pleno") ?? "pleno";
      const seniorityToDifficulty = {
        estagio: "beginner",
        junior: "beginner",
        pleno: "intermediate",
        senior: "advanced",
        especialista: "advanced",
      } as const;

      let currentInterviewId = existingInterviewId;

      if (!currentInterviewId || Number.isNaN(currentInterviewId)) {
        setInitError("Nenhuma entrevista ativa foi encontrada. Volte ao dashboard e crie uma nova sessão.");
        navigate({ to: "/dashboard" });
        return;
      }

      const interview = await apiGetInterview(currentInterviewId).catch(() => null);

      if (!interview) {
        setInitError("Entrevista inexistente ou removida. Crie uma nova sessão para continuar.");
        sessionStorage.removeItem("interviewId");
        navigate({ to: "/dashboard" });
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("jobDescription", interview.company_context ?? jd ?? "");
        sessionStorage.setItem("seniority", interview.seniority ?? savedSeniority);
      }

      await apiStartInterview(currentInterviewId).catch(() => undefined);
      setInterviewId(currentInterviewId);

      const loadedQuestions = await apiGetInterviewQuestions(currentInterviewId).catch(() => [] as QuestionResponse[]);

      if (loadedQuestions.length > 0) {
        const lastQuestion = loadedQuestions[loadedQuestions.length - 1] as QuestionResponse;
        setQuestionCount(loadedQuestions.length);
        setCurrentQuestion(lastQuestion);
        presentQuestion(lastQuestion);
        setAiTyping(false);
        return;
      }

      const q = await apiGenerateQuestion(currentInterviewId, "pt-BR");
      setCurrentQuestion(q);
      setQuestionCount(1);
      presentQuestion(q);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível carregar a primeira pergunta.";
      setInitError(`${message} Tente novamente.`);
      setAiTyping(false);
    } finally {
      generationRef.current = false;
    }
  }, [navigate, presentQuestion]);

  useEffect(() => {
    if (phase !== "live") return;
    initializeInterview();
  }, [phase, initializeInterview]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, aiTyping]);
  useEffect(() => { if (!aiTyping && !aiSpeaking && phase === "live") inputRef.current?.focus(); }, [aiTyping, aiSpeaking, phase]);
  useEffect(() => () => { tts.cancel(); }, []);

  // Auto-start/stop STT based on whose turn it is
  useEffect(() => {
    if (!stt.supported || !micOn || phase !== "live") { stt.stop(); return; }
    if (aiSpeaking || aiTyping || sending) {
      stt.stop();
    } else {
      // Brief delay so TTS audio doesn't bleed into mic input
      const t = setTimeout(() => stt.start(), 500);
      return () => clearTimeout(t);
    }
  }, [aiSpeaking, aiTyping, sending, micOn, phase, stt.supported, stt.start, stt.stop]);

  const presentText = (text: string) => {
    if (captionRef.current) clearInterval(captionRef.current);
    setAiTyping(false); setAiSpeaking(true);
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setMessages(m => [...m, { role: "ai", text, time }]);

    let i = 0;
    captionRef.current = setInterval(() => {
      i += Math.max(1, Math.floor(text.length / 90));
      setCurrentCaption(text.slice(0, Math.min(i, text.length)));
      if (i >= text.length) { clearInterval(captionRef.current!); captionRef.current = null; }
    }, 38);

    if (audioOn) {
      tts.speak(text, () => { setAiSpeaking(false); setCurrentCaption(""); });
    } else {
      setTimeout(() => { setAiSpeaking(false); setCurrentCaption(""); }, Math.min(text.length * 48, 8000));
    }
  };

  const handleRetryInitialQuestion = async () => {
    generationRef.current = false;
    await initializeInterview();
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || aiTyping || aiSpeaking || sending || !interviewId) return;
    stt.stop(); // stop listening before we send
    setSending(true);
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setMessages(m => [...m, { role: "user", text, time }]);
    setInput(""); setAiTyping(true);
    try {
      if (currentQuestion) await apiSubmitAnswer({ question_id: currentQuestion.id, answer_text: text, time_taken_seconds: elapsed });
      if (questionCount >= MAX_QUESTIONS) {
        await apiCompleteInterview(interviewId).catch(() => {});
        setAiTyping(false); setPhase("done"); setSending(false); return;
      }
      const nextQuestion = await apiGenerateQuestion(interviewId, "pt-BR");
      setCurrentQuestion(nextQuestion);
      setQuestionCount((count) => count + 1);
      presentQuestion(nextQuestion);
    } catch {
      setAiTyping(false);
      if (questionCount >= MAX_QUESTIONS) setPhase("done");
    } finally { setSending(false); }
  };

  const handleEndCall = async () => {
    tts.cancel();
    stt.stop();
    if (interviewId) await apiCompleteInterview(interviewId).catch(() => {});
    sessionStorage.removeItem("interviewId");
    navigate({ to: "/dashboard" });
  };

  const jobRole = typeof window !== "undefined" ? (sessionStorage.getItem("jobDescription") ?? "").slice(0, 50) : "";
  const progress = Math.min((questionCount / MAX_QUESTIONS) * 100, 100);
  const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="h-screen flex overflow-hidden select-none" style={{ background: M.bg, color: M.text, fontFamily: "'Google Sans', 'Roboto', sans-serif" }}>

      {/* ── Connecting / Waiting overlays ── */}
      <AnimatePresence>
        {phase === "connecting" && (
          <motion.div key="conn" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 z-50">
            <ConnectingScreen onDone={() => setPhase("waiting")} />
          </motion.div>
        )}
        {phase === "waiting" && (
          <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 z-40">
            <WaitingScreen onJoined={() => setPhase("live")} />
          </motion.div>
        )}
      </AnimatePresence>

      {initError && (
        <div className="absolute inset-x-0 top-0 z-50 flex justify-center pt-4">
          <div className="max-w-xl w-[calc(100%-2rem)] rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-100 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <span>{initError}</span>
              <button
                type="button"
                onClick={handleRetryInitialQuestion}
                className="rounded-lg bg-red-500/20 px-3 py-1.5 font-medium text-red-50 hover:bg-red-500/30 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Video area ── */}
      <div className="flex-1 relative flex flex-col min-w-0">

        {/* Meet top bar — overlay */}
        <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: "rgba(32,33,36,0.75)", backdropFilter: "blur(8px)" }}>
              <div className="h-6 w-6 rounded-full overflow-hidden" style={{ border: `1.5px solid ${M.avatarSofia}` }}>
                <img src={sofiaImg} alt="Sofia" className="h-full w-full object-cover" />
              </div>
              <span className="text-sm font-medium" style={{ color: M.text }}>Sofia · Mentora.ai</span>
            </div>
          </div>

          {/* Center: time + progress */}
          <div className="pointer-events-none flex flex-col items-center gap-1">
            <span className="text-sm font-medium tabular-nums" style={{ color: M.muted }}>{fmtTime(elapsed)}</span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: MAX_QUESTIONS }).map((_, i) => (
                <div key={i} className="h-1.5 w-5 rounded-full transition-all duration-500"
                  style={{ background: i < questionCount ? M.green : M.border }} />
              ))}
            </div>
          </div>

          {/* Right: options */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="text-xs px-2 py-1 rounded" style={{ background: "rgba(32,33,36,0.75)", color: M.muted }}>
              {questionCount}/{MAX_QUESTIONS} perguntas
            </div>
          </div>
        </div>

        {/* ── Sofia main tile ── */}
        <div className="flex-1 relative" style={{ background: M.tileActive }}>

          {/* Blurred bg */}
          <div className="absolute inset-0"
            style={{ backgroundImage: `url(${sofiaImg})`, backgroundSize: "cover", backgroundPosition: "center top", filter: "blur(60px) brightness(0.08) saturate(0.3)", transform: "scale(1.1)" }} />
          <div className="absolute inset-0" style={{ background: "rgba(28,29,30,0.65)" }} />

          {/* Active speaker border */}
          <AnimatePresence>
            {aiSpeaking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-none pointer-events-none z-20"
                style={{ boxShadow: `inset 0 0 0 3px ${M.green}` }} />
            )}
          </AnimatePresence>

          {/* Center: Sofia camera-off avatar */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="relative">
              {/* Speaking pulse */}
              <AnimatePresence>
                {aiSpeaking && (
                  <>
                    <motion.div className="absolute -inset-5 rounded-full pointer-events-none"
                      style={{ border: `2px solid ${M.green}`, opacity: 0.4 }}
                      animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.05, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }} />
                    <motion.div className="absolute -inset-2 rounded-full pointer-events-none"
                      style={{ border: `1px solid ${M.green}`, opacity: 0.3 }}
                      animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.05, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.6, delay: 0.2, ease: "easeInOut" }} />
                  </>
                )}
              </AnimatePresence>

              {/* Avatar */}
              <div className="h-36 w-36 rounded-full overflow-hidden transition-all duration-300"
                style={{
                  border: `4px solid ${aiSpeaking ? M.green : M.border}`,
                  boxShadow: aiSpeaking ? `0 0 0 2px ${M.green}33` : "none",
                }}>
                <img src={sofiaImg} alt="Sofia" className="h-full w-full object-cover object-top" />
              </div>

              {/* Speaking icon */}
              <AnimatePresence>
                {aiSpeaking && (
                  <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ background: M.green }}>
                    <SoundWave active bars={3} color="white" gap={1.5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Name + status */}
            <div className="text-center space-y-1">
              <p className="font-medium text-lg" style={{ color: M.text }}>Sofia</p>
              <div className="flex items-center justify-center gap-2">
                <AnimatePresence mode="wait">
                  {aiSpeaking ? (
                    <motion.div key="sp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-sm" style={{ color: M.green }}>
                      <SoundWave active bars={3} color={M.green} gap={1.5} />
                      <span>Falando</span>
                    </motion.div>
                  ) : aiTyping ? (
                    <motion.div key="th" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-sm" style={{ color: M.muted }}>
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full dot-1" style={{ background: M.muted }} />
                        <span className="h-1.5 w-1.5 rounded-full dot-2" style={{ background: M.muted }} />
                        <span className="h-1.5 w-1.5 rounded-full dot-3" style={{ background: M.muted }} />
                      </span>
                      <span>Processando</span>
                    </motion.div>
                  ) : phase === "live" ? (
                    <motion.div key="li" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-sm" style={{ color: M.muted }}>
                      <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: M.green }} />
                      <span>Ouvindo você</span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Captions */}
          <AnimatePresence>
            {currentCaption && (
              <motion.div key="cap" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-24 inset-x-0 z-20 flex justify-center px-10">
                <div className="max-w-2xl rounded-lg px-5 py-3 text-center text-[15px] leading-relaxed font-medium"
                  style={{ background: "rgba(0,0,0,0.8)", color: M.text, backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {currentCaption}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Self-view PiP — bottom right, Meet style */}
          <div className="absolute bottom-4 right-4 z-20 w-40 aspect-video rounded-2xl overflow-hidden shadow-2xl"
            style={{ border: `2px solid ${stt.listening && micOn ? M.red : M.border}`, transition: "border-color 0.3s" }}>
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: camOn ? M.tile : M.tileActive }}>
              {camOn ? (
                <div className="h-14 w-14 rounded-full flex items-center justify-center text-xl font-semibold"
                  style={{ background: "#5f6368", color: M.text }}>
                  V
                </div>
              ) : (
                <VideoOff className="h-5 w-5" style={{ color: M.muted }} />
              )}
            </div>
            {/* Listening pulse overlay */}
            {stt.listening && micOn && (
              <div className="absolute inset-0 pointer-events-none" style={{ border: `2px solid ${M.red}`, borderRadius: "1rem", animation: "pulse-glow 1.5s ease-in-out infinite" }} />
            )}
            {/* Mic indicator */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded px-1.5 py-0.5"
              style={{ background: "rgba(0,0,0,0.6)" }}>
              <div className="relative flex items-center justify-center">
                {stt.listening && micOn && (
                  <span className="absolute h-3.5 w-3.5 rounded-full animate-ping" style={{ background: `${M.red}80` }} />
                )}
                {micOn
                  ? <Mic className="h-3 w-3 relative z-10" style={{ color: stt.listening ? M.red : M.green }} />
                  : <MicOff className="h-3 w-3" style={{ color: M.red }} />}
              </div>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                {stt.listening && micOn ? "Ouvindo" : "Você"}
              </span>
            </div>
          </div>

          {/* Bottom-left nameplate */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
            <VideoOff className="h-3.5 w-3.5" style={{ color: M.muted }} />
            <span className="text-xs font-medium" style={{ color: M.text }}>Sofia</span>
            <div className="h-3 w-px" style={{ background: M.border }} />
            <SoundWave active={aiSpeaking} bars={4} color={aiSpeaking ? M.green : M.muted} />
          </div>

          {/* Done overlay */}
          <AnimatePresence>
            {phase === "done" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center"
                style={{ background: "rgba(30,31,32,0.92)", backdropFilter: "blur(8px)" }}>
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 220 }}
                  className="flex flex-col items-center gap-5">
                  <div className="h-16 w-16 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(30,163,98,0.15)", border: `1.5px solid ${M.green}` }}>
                    <CheckCircle2 className="h-8 w-8" style={{ color: M.green }} />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-semibold" style={{ color: M.text }}>Entrevista concluída!</p>
                    <p className="text-sm mt-1" style={{ color: M.muted }}>Gerando seu feedback personalizado...</p>
                  </div>
                  <button onClick={() => navigate({ to: "/feedback" })}
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white active:scale-95 transition-all"
                    style={{ background: M.avatarSofia, color: "#202124" }}>
                    Ver feedback <ChevronRight className="h-4 w-4" />
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Inline input — shown when chat is closed */}
        {phase === "live" && !showChat && (
          <div className="shrink-0 px-3 py-2" style={{ background: M.bg, borderTop: `1px solid ${M.border}` }}>
            {stt.listening && micOn && (
              <div className="flex items-center gap-1.5 px-1 pb-1">
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: M.red }} />
                <span className="text-[11px]" style={{ color: M.muted }}>Ouvindo sua voz... fale sua resposta</span>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl p-2" style={{ background: M.chatInput }}>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                disabled={aiTyping || aiSpeaking} rows={1}
                placeholder={aiTyping || aiSpeaking ? "Sofia está falando..." : stt.listening && micOn ? "🎤 Ouvindo sua voz..." : "Digite ou fale sua resposta..."}
                className="flex-1 resize-none bg-transparent px-2 py-1 text-sm focus:outline-none disabled:opacity-40 max-h-20"
                style={{ color: M.text }} />
              <button onClick={handleSend} disabled={!input.trim() || aiTyping || aiSpeaking || sending}
                className="h-8 w-8 rounded-full flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all shrink-0"
                style={{ background: M.avatarSofia, color: "#202124" }}>
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Meet control bar ── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4" style={{ background: M.bg }}>

          {/* Left: time */}
          <div className="w-32 flex items-center gap-2 overflow-hidden">
            <span className="text-sm tabular-nums font-medium" style={{ color: M.muted }}>{fmtTime(elapsed)}</span>
            <span className="text-sm" style={{ color: M.muted }}>·</span>
            <span className="text-sm truncate" style={{ color: M.muted }}>{jobRole || "Entrevista"}</span>
          </div>

          {/* Center: main controls */}
          <div className="flex items-center gap-3">
            <MeetBtn
              onClick={() => {
                if (micOn) { setMicOn(false); stt.stop(); }
                else { setMicOn(true); }
              }}
              label={micOn ? (stt.listening ? "Parar de gravar" : "Silenciar") : "Ativar microfone"}
              off={!micOn}
              listening={micOn && stt.listening}>
              {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </MeetBtn>

            <MeetBtn onClick={() => setCamOn(v => !v)} label={camOn ? "Desligar câmera" : "Ligar câmera"} off={!camOn}>
              {camOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </MeetBtn>

            <MeetBtn
              onClick={() => { const n = !audioOn; setAudioOn(n); if (!n) tts.cancel(); }}
              label={audioOn ? "Silenciar Sofia" : "Ouvir Sofia"}
              off={!audioOn}
            >
              {audioOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
            </MeetBtn>

            {/* End call — prominent red */}
            <button onClick={handleEndCall} title="Encerrar chamada"
              className="h-14 px-6 rounded-full flex items-center gap-2.5 text-white font-medium text-sm active:scale-95 transition-all ml-2"
              style={{ background: M.red }}>
              <PhoneOff className="h-5 w-5" />
              <span className="hidden sm:inline">Encerrar</span>
            </button>
          </div>

          {/* Right: chat toggle */}
          <div className="w-32 flex items-center justify-end gap-2">
            <MeetBtn onClick={() => setShowChat(v => !v)} label="Chat" active={showChat}>
              <MessageSquare className="h-5 w-5" />
            </MeetBtn>
            <MeetBtn onClick={() => {}} label="Participantes">
              <Users className="h-5 w-5" />
            </MeetBtn>
          </div>
        </div>
      </div>

      {/* ── Chat panel ── */}
      <AnimatePresence initial={false}>
        {showChat && (
          <motion.aside key="chat"
            initial={{ width: 0, opacity: 0 }} animate={{ width: 360, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col shrink-0 overflow-hidden"
            style={{ background: M.chatBg, borderLeft: `1px solid ${M.border}` }}>

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `1px solid ${M.border}` }}>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full overflow-hidden" style={{ border: `1.5px solid ${M.avatarSofia}` }}>
                  <img src={sofiaImg} alt="Sofia" className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: M.text }}>Chat da entrevista</p>
                  <p className="text-[11px]" style={{ color: M.muted }}>{questionCount}/{MAX_QUESTIONS} perguntas</p>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10">
                <X className="h-4 w-4" style={{ color: M.muted }} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin"
              style={{ scrollbarColor: `${M.border} transparent` }}>
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                    className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className="shrink-0">
                      {m.role === "ai"
                        ? <div className="h-8 w-8 rounded-full overflow-hidden" style={{ border: `1.5px solid ${M.avatarSofia}` }}>
                            <img src={sofiaImg} alt="Sofia" className="h-full w-full object-cover" />
                          </div>
                        : <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold"
                            style={{ background: "#5f6368", color: M.text }}>V</div>
                      }
                    </div>
                    <div className={`flex flex-col gap-1 max-w-[76%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium" style={{ color: M.muted }}>{m.role === "ai" ? "Sofia" : "Você"}</span>
                        <span className="text-[10px] tabular-nums" style={{ color: `${M.muted}80` }}>{m.time}</span>
                      </div>
                      <div className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                        style={m.role === "ai"
                          ? { background: "#28292b", color: M.text, borderRadius: "4px 18px 18px 18px", border: `1px solid ${M.border}` }
                          : { background: M.avatarSofia, color: "#202124", borderRadius: "18px 4px 18px 18px", fontWeight: 500 }}>
                        {m.text}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {aiTyping && (
                  <motion.div key="typ" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2.5">
                    <div className="h-8 w-8 rounded-full overflow-hidden shrink-0" style={{ border: `1.5px solid ${M.avatarSofia}` }}>
                      <img src={sofiaImg} alt="Sofia" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium" style={{ color: M.muted }}>Sofia</span>
                      <div className="rounded-2xl px-4 py-3" style={{ background: "#28292b", border: `1px solid ${M.border}`, borderRadius: "4px 18px 18px 18px" }}>
                        <div className="flex items-center gap-1.5">
                          {[0, 0.2, 0.4].map((d, i) => (
                            <span key={i} className="h-2 w-2 rounded-full"
                              style={{ background: M.muted, animation: `connecting 1.4s ease-in-out infinite ${d}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input */}
            {phase !== "done" && (
              <div className="shrink-0 p-4" style={{ borderTop: `1px solid ${M.border}` }}>
                {stt.listening && micOn && (
                  <div className="flex items-center gap-1.5 px-1 pb-1.5">
                    <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: M.red }} />
                    <span className="text-[11px]" style={{ color: M.muted }}>Ouvindo sua voz...</span>
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-2xl p-2" style={{ background: M.chatInput }}>
                  <textarea
                    ref={inputRef} value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    disabled={aiTyping || aiSpeaking} rows={2}
                    placeholder={aiTyping || aiSpeaking ? "Sofia está falando..." : stt.listening && micOn ? "🎤 Ouvindo sua voz..." : "Digite ou fale sua resposta..."}
                    className="flex-1 resize-none bg-transparent px-2 py-1 text-[13px] leading-relaxed focus:outline-none disabled:opacity-40"
                    style={{ color: M.text, caretColor: M.avatarSofia }}
                  />
                  <button onClick={handleSend} disabled={!input.trim() || aiTyping || aiSpeaking || sending}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white disabled:opacity-30 active:scale-95 transition-all shrink-0"
                    style={{ background: input.trim() ? M.avatarSofia : M.border, color: input.trim() ? "#202124" : M.muted }}>
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px]" style={{ color: `${M.muted}60` }}>Enter para enviar</p>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>


    </div>
  );
}
