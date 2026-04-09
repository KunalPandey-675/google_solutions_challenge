import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-12 bg-[#F8FAFC] border-t border-slate-200">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="text-xl font-serif font-bold tracking-tight text-slate-900 mb-4 block">
              JudgeNet
            </Link>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Advancing fairness in artificial intelligence through rigorous 
              mathematical testing and clinical auditing.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-slate-600">
              <li><Link href="#features" className="hover:text-slate-900 transition-colors">Features</Link></li>
              <li><Link href="#how-it-works" className="hover:text-slate-900 transition-colors">How it Works</Link></li>
              <li><Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link></li>
              <li><Link href="/roadmap" className="hover:text-slate-900 transition-colors">Roadmap</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-6">Resources</h4>
            <ul className="space-y-4 text-sm text-slate-600">
              <li><Link href="/docs" className="hover:text-slate-900 transition-colors">Documentation</Link></li>
              <li><Link href="/api" className="hover:text-slate-900 transition-colors">API Reference</Link></li>
              <li><Link href="/research" className="hover:text-slate-900 transition-colors">Research Papers</Link></li>
              <li><Link href="/blog" className="hover:text-slate-900 transition-colors">Tech Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-slate-600">
              <li><Link href="/about" className="hover:text-slate-900 transition-colors">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-slate-900 transition-colors">Careers</Link></li>
              <li><Link href="/security" className="hover:text-slate-900 transition-colors">Security</Link></li>
              <li><Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()} JudgeNet AI Inc. All rights reserved.
          </div>
          <div className="flex gap-8 text-xs text-slate-400">
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
