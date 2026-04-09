import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/40 bg-white/70 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-serif font-bold tracking-tight text-slate-900">
              JudgeNet
            </span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="#features" className="hover:text-slate-900 transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="hover:text-slate-900 transition-colors">
            How it Works
          </Link>
          <Link href="#docs" className="hover:text-slate-900 transition-colors">
            Docs
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-slate-600 hover:text-slate-900">
            Log in
          </Button>
          <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-5">
            Start Audit
          </Button>
        </div>
      </div>
    </header>
  );
}
