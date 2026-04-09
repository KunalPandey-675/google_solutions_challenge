"use client";

import { motion } from "framer-motion";
import { 
  Database, 
  Terminal, 
  Scale, 
  RotateCcw, 
  Wrench,
  FileSearch
} from "lucide-react";

const features = [
  {
    title: "Dataset Bias Analysis",
    description: "Multi-dimensional scanning for imbalances in training data across protected classes. Identifying localized disparate impact before model training begins.",
    icon: Database,
    number: "01"
  },
  {
    title: "Model Stress Testing",
    description: "Automated simulation of adversarial inputs to uncover latent discriminatory behavior. We test at the boundary of decision probability.",
    icon: Terminal,
    number: "02"
  },
  {
    title: "Fairness Scoring",
    description: "Standardized metrics including Demographic Parity, Equal Opportunity, and Predictive Rate Parity for diverse stakeholders.",
    icon: Scale,
    number: "03"
  },
  {
    title: "Bias Replay",
    description: "Diagnostic execution of specific bias cases to understand root cause and weighting in isolation.",
    icon: RotateCcw,
    number: "04"
  }
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-20">
          {/* Left: Sticky Section Title */}
          <div className="lg:w-1/3">
             <div className="sticky top-32">
                <div className="font-mono text-[10px] font-bold tracking-[0.3em] text-indigo-600 uppercase mb-6 flex items-center gap-4">
                  <span className="h-[1px] w-8 bg-indigo-600" />
                  CAPABILITIES
                </div>
                <h3 className="text-5xl font-serif text-slate-900 mb-8 font-bold leading-none tracking-tighter">
                  Scientific <br /> 
                  Audit Gate.
                </h3>
                <p className="text-slate-500 font-sans leading-relaxed max-w-xs">
                  Replacing manual ethics reviews with rigorous, reproducible testing.
                </p>
             </div>
          </div>

          {/* Right: Asymmetrical Exhibit Flow */}
          <div className="lg:w-2/3 space-y-32">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className={`relative flex flex-col md:flex-row gap-12 ${index % 2 !== 0 ? 'md:pl-20' : ''}`}
              >
                {/* Visual Placeholder for Exhibit */}
                <div className="flex-1 aspect-video bg-[#F1F5F9]/50 border border-slate-100 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute top-2 left-2 font-mono text-[8px] text-slate-300">FIG_{feature.number}</div>
                   <feature.icon className="w-12 h-12 text-slate-200" />
                   <div className="absolute inset-0 bg-grid opacity-10" />
                </div>

                <div className="flex-1">
                   <div className="font-mono text-[10px] font-bold text-indigo-600 mb-4 tracking-widest uppercase">EXHIBIT_{feature.number}</div>
                   <h4 className="text-3xl font-serif font-bold text-slate-900 mb-6 tracking-tight">{feature.title}</h4>
                   <p className="text-slate-500 leading-relaxed text-sm mb-8">
                     {feature.description}
                   </p>
                   <div className="h-px w-12 bg-slate-200" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
