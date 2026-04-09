"use client";

import { motion } from "framer-motion";

export function Process() {
  const steps = [
    {
      code: "0xA1",
      title: "Secure Ingestion",
      description: "Link datasets (S3, Snowflake) via our encrypted bridge."
    },
    {
      code: "0xB2",
      title: "Metric Orchesrtation",
      description: "Select from 40+ pre-defined fairness metrics."
    },
    {
      code: "0xC3",
      title: "Execution Phase",
      description: "Stress-test across millions of demographic permutations."
    },
    {
      code: "0xD4",
      title: "Protocol Release",
      description: "Export compliance documentation for deployment."
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white border-y border-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />
      
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-20">
          <div className="lg:w-1/4">
             <div className="font-mono text-[10px] font-bold tracking-[0.3em] text-indigo-600 uppercase mb-6 flex items-center gap-4">
                <span className="h-[1px] w-8 bg-indigo-600" />
                PROTOCOL_FLOW
             </div>
             <h3 className="text-4xl font-serif text-slate-900 font-bold tracking-tight mb-8">
               Pipeline <br />
               Architecture.
             </h3>
          </div>

          <div className="lg:w-3/4 flex flex-col md:flex-row gap-4 relative">
            {/* Horizontal connecting line for desktop */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-100 hidden md:block -translate-y-1/2" />
            
            {steps.map((step, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex-1 bg-white border border-slate-100 p-8 relative z-10 group hover:border-indigo-200 transition-colors"
              >
                <div className="font-mono text-[10px] text-slate-300 mb-6 group-hover:text-indigo-400 transition-colors">[{step.code}]</div>
                <h4 className="text-xl font-serif font-bold text-slate-900 mb-4">{step.title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {step.description}
                </p>
                
                {/* Visual marker for flow */}
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#F1F5F9] border border-slate-100 rounded-full flex items-center justify-center">
                   <div className="w-1.5 h-1.5 bg-slate-300 rounded-full group-hover:bg-indigo-500 transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
