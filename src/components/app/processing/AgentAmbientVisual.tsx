import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

export default function AgentAmbientVisual() {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 80, damping: 22, mass: 0.8 });
  const springY = useSpring(pointerY, { stiffness: 80, damping: 22, mass: 0.8 });
  const coreX = useTransform(springX, (v) => v * 0.32);
  const coreY = useTransform(springY, (v) => v * 0.32);

  return (
    <div
      className="relative flex h-[24rem] items-center justify-center overflow-hidden"
      onPointerMove={(event) => {
        if (reduceMotion) return;
        const rect = event.currentTarget.getBoundingClientRect();
        pointerX.set(((event.clientX - rect.left) / rect.width - 0.5) * 30);
        pointerY.set(((event.clientY - rect.top) / rect.height - 0.5) * 24);
      }}
      onPointerLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(34%_30%_at_50%_50%,rgba(34,211,238,0.045),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(46%_46%_at_50%_50%,rgba(255,255,255,0.02),transparent_72%)]" />
      <motion.div
        className="absolute h-[20rem] w-[20rem] rounded-full border border-sky-400/8"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { duration: 30, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute h-[15.5rem] w-[15.5rem] rounded-full border border-violet-400/7"
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={reduceMotion ? undefined : { duration: 24, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute h-[11.25rem] w-[11.25rem] rounded-full border border-white/5"
        animate={reduceMotion ? undefined : { scale: [1, 1.035, 1], opacity: [0.32, 0.65, 0.32] }}
        transition={reduceMotion ? undefined : { duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.58)]"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { duration: 7.6, repeat: Infinity, ease: "linear" }}
        style={{ originX: "50%", originY: "104px" }}
      />
      <motion.div
        className="absolute h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_16px_rgba(167,139,250,0.55)]"
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={reduceMotion ? undefined : { duration: 9.2, repeat: Infinity, ease: "linear" }}
        style={{ originX: "50%", originY: "76px" }}
      />
      <motion.div
        className="absolute h-[12rem] w-px bg-[linear-gradient(180deg,transparent,rgba(56,189,248,0.22),transparent)]"
        animate={reduceMotion ? undefined : { opacity: [0.2, 0.9, 0.2], scaleY: [0.94, 1.04, 0.94] }}
        transition={reduceMotion ? undefined : { duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-px w-[12rem] bg-[linear-gradient(90deg,transparent,rgba(99,102,241,0.2),transparent)]"
        animate={reduceMotion ? undefined : { opacity: [0.18, 0.72, 0.18], scaleX: [0.94, 1.05, 0.94] }}
        transition={reduceMotion ? undefined : { duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-[8.5rem] w-[8.5rem] rounded-full border border-white/[0.035]"
        animate={reduceMotion ? undefined : { scale: [0.98, 1.03, 0.98], opacity: [0.2, 0.45, 0.2] }}
        transition={reduceMotion ? undefined : { duration: 6.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_34%,rgba(56,189,248,0.1),rgba(37,99,235,0.045)_48%,rgba(15,23,42,0.12)_74%)] shadow-[0_18px_40px_-34px_rgba(37,99,235,0.2)]"
        style={reduceMotion ? undefined : { x: coreX, y: coreY }}
        animate={reduceMotion ? undefined : { rotate: [0, 3, 0, -3, 0] }}
        transition={reduceMotion ? undefined : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.06),transparent_72%)]"
          animate={reduceMotion ? undefined : { opacity: [0.45, 0.78, 0.45] }}
          transition={reduceMotion ? undefined : { duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="h-8 w-8 rounded-full border-[2px] border-white/8 border-t-sky-300"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    </div>
  );
}
