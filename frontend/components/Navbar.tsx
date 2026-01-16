"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: "Solução", href: "/#solucao" },
    { name: "Recursos", href: "/#recursos" },
    { name: "Planos", href: "/#planos" },
    { name: "Contato", href: "/contato" },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-4 inset-x-0 z-50 px-4"
    >
      <div className="max-w-5xl mx-auto">
        <div className="glass rounded-full px-6 py-3 shadow-soft flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">
              AgendaIA
            </span>
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
              return (
                <a
                  key={link.name}
                  href={link.href}
                  className={`text-sm transition-colors font-medium ${
                    isActive 
                      ? 'text-cyan-600 font-semibold' 
                      : 'text-slate-600 hover:text-cyan-600'
                  }`}
                >
                  {link.name}
                </a>
              );
            })}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <motion.a
              href="/login"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="text-white px-6 py-2.5 rounded-full text-sm font-medium
                         shadow-md hover:shadow-lg cursor-pointer
                         bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-600"
            >
              Entrar
            </motion.a>
            <motion.a
              href="#planos"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-cyan-700
                         border border-cyan-200/70 bg-white/80 hover:bg-white cursor-pointer
                         transition-all duration-300 shadow-sm"
            >
              Teste Grátis
            </motion.a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isOpen ? (
              <X className="w-5 h-5 text-slate-900" strokeWidth={1.5} />
            ) : (
              <Menu className="w-5 h-5 text-slate-900" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-2 glass rounded-2xl p-4 shadow-medium"
            >
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`px-4 py-3 rounded-xl transition-colors font-medium ${
                        isActive
                          ? 'text-cyan-700 bg-cyan-50 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {link.name}
                    </a>
                  );
                })}
                <button className="mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-full text-sm
                                  font-medium cursor-pointer hover:from-cyan-600 hover:to-blue-600">
                  Entrar
                </button>
                <a
                  href="#planos"
                  className="mt-2 px-6 py-3 rounded-full text-sm font-semibold text-cyan-700 text-center
                             border border-cyan-200/70 bg-white/90 hover:bg-white cursor-pointer transition-colors"
                >
                  Teste Grátis
                </a>
                         
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
