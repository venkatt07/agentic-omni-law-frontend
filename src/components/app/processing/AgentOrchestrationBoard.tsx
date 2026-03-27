import { motion } from "framer-motion";
import AgentNodeCard from "./AgentNodeCard";
import type { AgentNodeData } from "./types";

interface AgentOrchestrationBoardProps {
  leadNode: AgentNodeData;
  supportingNodes: AgentNodeData[];
}

export default function AgentOrchestrationBoard({ leadNode, supportingNodes }: AgentOrchestrationBoardProps) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,38,0.78),rgba(5,12,28,0.92))] p-5 shadow-[0_28px_78px_-56px_rgba(2,6,23,0.78)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.26em] text-slate-400">Workspace orchestration</div>
          <div className="mt-2 text-[1.2rem] font-semibold tracking-[-0.03em] text-white">Agents collaborating on the active case</div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="relative">
          <div className="pointer-events-none absolute left-[2.1rem] top-[100%] hidden h-6 w-px bg-white/10 lg:block" />
          <AgentNodeCard node={{ ...leadNode, emphasis: "lead" }} />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {supportingNodes.map((node, index) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.15), ease: "easeOut" }}
            >
              <AgentNodeCard node={{ ...node, emphasis: "support" }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
