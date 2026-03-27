import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function Splash() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/");
    }, 2500); // 2.5 seconds splash

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground overflow-hidden">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <img
            src="/logo.png"
            alt="Agentic Omni Law logo"
            className="h-full w-full object-contain p-3"
          />
          {/* Shimmer effect */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          </div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold font-heading tracking-tight mb-2">AGENTIC OMNI LAW</h1>
          <p className="text-muted-foreground text-lg tracking-wider uppercase font-medium">Justice Through Intelligence</p>
        </motion.div>
      </motion.div>
      
      {/* Background ambient light */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
    </div>
  );
}
