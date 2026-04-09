"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export function ProductDashboard() {
  return (
    <section className="py-24 bg-[#F8FAFC]">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <h2 className="text-[10px] font-bold tracking-[0.2em] text-indigo-600 uppercase mb-4">THE DASHBOARD</h2>
          <h3 className="text-4xl md:text-5xl font-serif text-slate-900 font-bold mb-6">Actionable intelligence, <br />not just data points.</h3>
          <p className="text-lg text-slate-600">
            A research-grade interface that transforms complex fairness metrics into 
            clear, actionable decisions for your engineering team.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "circOut" }}
          className="max-w-5xl mx-auto"
        >
          <Card className="border-slate-200/50 shadow-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/30 px-8 py-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-serif font-bold text-slate-900">Audit Report: LoanApproval_v4_prod</CardTitle>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-sans font-bold">Generated 14 mins ago</p>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1">
                <AlertCircle className="w-3 h-3 mr-2" />
                Action Required
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-3">
                {/* Sidebar Stats */}
                <div className="col-span-1 border-r border-slate-100 p-8 space-y-8 bg-slate-50/20">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Global Fairness Index</div>
                    <div className="text-5xl font-serif font-bold text-slate-900">72.4</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: "72%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 2, ease: "anticipate", delay: 0.5 }}
                          className="h-full bg-amber-500" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <div className="p-3 rounded-lg border border-slate-200 bg-white">
                        <div className="text-[10px] font-bold text-slate-400 mb-1">MOST IMPACTED GROUP</div>
                        <div className="text-sm font-medium">Protected Class: Age (60+)</div>
                        <div className="text-[10px] text-amber-600 mt-1 font-bold">-14.2% Selection Delta</div>
                     </div>
                     <div className="p-3 rounded-lg border border-slate-200 bg-white">
                        <div className="text-[10px] font-bold text-slate-400 mb-1">STRESS TEST COVERAGE</div>
                        <div className="text-sm font-medium">94.8% (Satisfactory)</div>
                     </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="col-span-2 p-8">
                  <div className="mb-8">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Info className="w-4 h-4 text-indigo-500" />
                      Metric Comparison By Protected Class
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-slate-100">
                          <TableHead className="text-[10px] font-bold tracking-widest uppercase">Demographic</TableHead>
                          <TableHead className="text-[10px] font-bold tracking-widest uppercase">Disp. Impact</TableHead>
                          <TableHead className="text-[10px] font-bold tracking-widest uppercase">Eq. Opp.</TableHead>
                          <TableHead className="text-[10px] font-bold tracking-widest uppercase">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="border-slate-100">
                          <TableCell className="text-sm font-medium">Gender (Non-binary)</TableCell>
                          <TableCell className="text-sm text-slate-600">0.82</TableCell>
                          <TableCell className="text-sm text-slate-600">0.91</TableCell>
                          <TableCell><CheckCircle2 className="w-4 h-4 text-emerald-500" /></TableCell>
                        </TableRow>
                        <TableRow className="border-slate-100">
                          <TableCell className="text-sm font-medium">Ethnicity (Category B)</TableCell>
                          <TableCell className="text-sm text-slate-600">0.64</TableCell>
                          <TableCell className="text-sm text-slate-600">0.78</TableCell>
                          <TableCell><AlertCircle className="w-4 h-4 text-amber-500" /></TableCell>
                        </TableRow>
                        <TableRow className="border-slate-100">
                          <TableCell className="text-sm font-medium">Veteran Status</TableCell>
                          <TableCell className="text-sm text-slate-600">0.98</TableCell>
                          <TableCell className="text-sm text-slate-600">0.99</TableCell>
                          <TableCell><CheckCircle2 className="w-4 h-4 text-emerald-500" /></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="p-4 rounded-xl bg-indigo-50 border border-indigo-100"
                  >
                    <h5 className="text-xs font-bold text-indigo-900 mb-2">Recommendation: Fairness Re-weighting</h5>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      Applying a re-weighting factor of 1.25 to Ethnicity (Category B) samples is estimated 
                      to increase the Global Fairness Index to <span className="font-bold">84.2</span> with 
                      minimal impact on overall model accuracy.
                    </p>
                  </motion.div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
