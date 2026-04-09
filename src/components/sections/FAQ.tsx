"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does JudgeNet define 'fairness'?",
    answer: "We support over 40 mathematical definitions of fairness, including Group Fairness (e.g., Demographic Parity) and Individual Fairness. JudgeNet doesn't 'pick' a definition for you; it provides the data to help you decide which metric aligns with your industry standards."
  },
  {
    question: "Does my data leave my infrastructure?",
    answer: "No. JudgeNet offers on-premise and VPC deployment options. Our SDK allows you to run audits locally, only sending metadata and scores to the dashboard for visualization."
  },
  {
    question: "Is JudgeNet compatible with all ML frameworks?",
    answer: "Yes. Our agnostic orchestration layer supports models built in PyTorch, TensorFlow, Scikit-Learn, and LLMs accessible via API (OpenAI, Anthropic, etc.)."
  },
  {
    question: "Can JudgeNet help with EU AI Act compliance?",
    answer: "Absolutely. We provide specific audit templates mapped to the EU AI Act's requirements for transparency and non-discrimination in high-risk AI systems."
  }
];

export function FAQ() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-[10px] font-bold tracking-[0.2em] text-indigo-600 uppercase mb-4">RESOURCES</h2>
          <h3 className="text-4xl font-serif text-slate-900 font-bold">Frequently Asked Questions</h3>
        </motion.div>
        
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Accordion className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-slate-200">
                <AccordionTrigger className="text-left font-serif text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 text-base leading-relaxed pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
