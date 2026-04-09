"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { 
        duration: 0.8, 
        ease: "easeOut" as const
      } 
    },
  };

  return (
    <section className="relative min-h-[90vh] flex items-stretch overflow-hidden bg-[#F1F5F9]/30">
      <div className="absolute inset-0 bg-grid -z-10 opacity-40" />
      
      {/* Vertical Section Marker */}
      <div className="hidden lg:flex w-24 border-r border-slate-200 flex-col items-center justify-between py-12 bg-white/50 backdrop-blur-sm z-20">
        <div className="font-mono text-[10px] font-bold tracking-[0.3em] uppercase text-vertical rotate-180 text-slate-400">
          JUDGENET ENGINE v2.4
        </div>
        <div className="h-24 w-px bg-slate-200" />
        <div className="font-mono text-[10px] font-bold text-slate-900">
          [ 00 ]
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Column: Editorial Content */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-20 xl:px-32 py-20 relative">
          <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-slate-300 -translate-x-4 -translate-y-4" />
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-xl"
          >
            <motion.div variants={itemVariants} className="font-mono text-[10px] font-bold tracking-widest text-indigo-600 uppercase mb-6 flex items-center gap-4">
              <span className="h-[1px] w-8 bg-indigo-600" />
              STATUS: DEPLOYED_AUDIT_PROTOCOL
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-7xl md:text-8xl font-serif font-bold text-slate-900 leading-[0.85] mb-8 tracking-tighter">
              Judge AI <br />
              <span className="text-slate-300 italic">Before Use</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg text-slate-500 mb-12 leading-relaxed font-sans max-w-md">
              Scientific infrastructure for bias identification.
              We replace qualitative reviews with mathematical certainty.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex items-center gap-8">
              <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 rounded-none h-14 px-10 text-xs font-mono tracking-widest uppercase transition-all">
                Initiate Audit
              </Button>
              <div className="hidden sm:flex items-center gap-4 group cursor-pointer">
                <div className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center group-hover:bg-slate-900 group-hover:border-slate-900 transition-colors">
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                </div>
                <span className="font-mono text-[10px] font-bold tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors uppercase">View Whitepaper</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Technical Metadata Snippet */}
          <div className="hidden xl:block absolute bottom-12 left-32 font-mono text-[9px] text-slate-300 space-y-1">
             <div>LATITUDE: 40.7128° N</div>
             <div>LONGITUDE: 74.0060° W</div>
             <div>ENCRYPTION: AES-256-GCM</div>
          </div>
        </div>

        {/* Right Column: Abstract Topology Data Art */}
        <div className="flex-1 bg-white border-l border-slate-200 relative overflow-hidden flex items-center justify-center p-12">
          <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="relative w-full max-w-lg aspect-square"
          >
            {/* Abstract SVG Topology map */}
            <svg viewBox="0 0 400 400" className="w-full h-full text-indigo-100">
               <circle cx="200" cy="200" r="180" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
               <circle cx="200" cy="200" r="120" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
               <circle cx="200" cy="200" r="60" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
               
               {/* Animated Bias Nodes */}
               <motion.g
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 1 }}
               >
                 {[
                   { x: 120, y: 150, color: "text-indigo-500", label: "GROUP_A" },
                   { x: 280, y: 180, color: "text-amber-500", label: "BIAS_FLAG" },
                   { x: 200, y: 300, color: "text-slate-400", label: "NEUTRAL" },
                   { x: 180, y: 80, color: "text-indigo-500", label: "GROUP_B" },
                 ].map((node, i) => (
                   <g key={i}>
                     <motion.circle 
                       cx={node.x} cy={node.y} r="4" 
                       className={node.color} fill="currentColor"
                       animate={{ r: [4, 6, 4] }}
                       transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                     />
                     <motion.line 
                        x1="200" y1="200" x2={node.x} y2={node.y} 
                        stroke="currentColor" strokeWidth="0.5" opacity="0.4" 
                     />
                     <text x={node.x + 8} y={node.y + 4} className="font-mono text-[8px] fill-slate-400 font-bold tracking-tighter">{node.label}</text>
                   </g>
                 ))}
               </motion.g>
            </svg>

            {/* Floating Technical Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass p-6 rounded-none border-slate-200/50 shadow-none text-center min-w-[200px]">
               <div className="font-mono text-[9px] text-slate-400 mb-2 tracking-widest uppercase">Parity Delta</div>
               <div className="text-5xl font-serif text-slate-900 font-bold">0.82</div>
               <div className="mt-4 flex justify-center gap-1">
                 {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`h-1 w-4 ${i <= 4 ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                 ))}
               </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
