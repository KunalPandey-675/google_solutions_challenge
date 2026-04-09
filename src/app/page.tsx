import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Stats } from "@/components/sections/Stats";
import { Features } from "@/components/sections/Features";
import { Process } from "@/components/sections/Process";
import { ProductDashboard } from "@/components/sections/ProductDashboard";
import { FAQ } from "@/components/sections/FAQ";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Features />
        <Process />
        <ProductDashboard />
        <FAQ />
        
        {/* Final CTA Section */}
        <section className="py-24 bg-slate-900 overflow-hidden relative">
          <div className="absolute inset-0 bg-grid opacity-[0.05] invert" />
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-serif text-white font-bold mb-6">
                Ready to audit your <br /> intelligent systems?
              </h2>
              <p className="text-lg text-slate-400 mb-10 max-w-lg mx-auto leading-relaxed">
                Join leading research labs and enterprise AI teams in building 
                a more equitable automated future.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-full h-14 px-8 text-base font-bold">
                  Get Started for Free
                </Button>
                <Button variant="ghost" size="lg" className="text-white hover:bg-white/10 rounded-full h-14 px-8 text-base">
                  Talk to a Specialist
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
