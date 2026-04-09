"use client";

import { motion } from "framer-motion";

export function Stats() {
  const stats = [
    { label: "Subgroups Analyzed", value: "48M+" },
    { label: "Bias Patterns Identified", value: "2.4K" },
    { label: "Fairness Score Increase", value: "+32%" },
    { label: "Enterprise Trust", value: "99.9%" },
  ];

  return (
    <section className="py-12 bg-white border-y border-slate-100">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {stats.map((stat, index) => (
            <div key={index} className="text-center lg:text-left">
              <div className="text-3xl font-serif font-bold text-slate-900 mb-1">{stat.value}</div>
              <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
