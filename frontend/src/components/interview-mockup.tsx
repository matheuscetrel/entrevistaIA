import { motion } from "framer-motion";
import { Mic, Video } from "lucide-react";
import sofiaImg from "@/assets/sofia-portrait.jpg";

export function InterviewMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className="relative w-full max-w-xl mx-auto"
    >
      <div className="absolute -inset-12 bg-gradient-accent opacity-20 blur-3xl rounded-full" />
      <div className="relative rounded-3xl glass shadow-elevated p-3">
        {/* Window chrome */}
        <div className="flex items-center justify-between px-2 pb-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <div className="flex items-center gap-2 rounded-full bg-elevated px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-[10px] font-medium tracking-wide">REC · 04:32</span>
          </div>
        </div>

        {/* Video grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Sofia tile */}
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden ring-speaking">
            <img src={sofiaImg} alt="Sofia" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-md bg-black/55 backdrop-blur-sm px-2 py-1">
              <div className="flex items-end gap-0.5 h-3">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-accent rounded-full speak-bar"
                    style={{ animationDelay: `${i * 0.12}s`, height: "100%" }}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium text-white">Sofia · IA</span>
            </div>
            <div className="absolute top-2 right-2 rounded-full bg-accent/90 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
              falando
            </div>
          </div>
          {/* User tile */}
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-[radial-gradient(ellipse_at_center,_oklch(0.32_0.03_60),_oklch(0.18_0.008_60))]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-gradient-accent flex items-center justify-center font-display text-4xl text-accent-foreground shadow-soft">
                V
              </div>
            </div>
            <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-md bg-black/55 backdrop-blur-sm px-2 py-1">
              <Mic className="h-2.5 w-2.5 text-white" />
              <span className="text-[11px] font-medium text-white">Você</span>
            </div>
          </div>
        </div>

        {/* Caption */}
        <div className="mt-3 rounded-xl bg-black/40 backdrop-blur-sm px-3 py-2.5 text-center">
          <p className="text-[13px] leading-snug text-white/95">
            "Me conta de um projeto desafiador que você liderou recentemente..."
          </p>
        </div>

        {/* Controls */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {[Mic, Video].map((Icon, i) => (
            <div key={i} className="h-8 w-8 rounded-full bg-elevated flex items-center justify-center">
              <Icon className="h-3.5 w-3.5 text-foreground" />
            </div>
          ))}
          <div className="h-8 px-3 rounded-full bg-destructive flex items-center text-[11px] font-medium text-destructive-foreground">
            Encerrar
          </div>
        </div>
      </div>
    </motion.div>
  );
}
