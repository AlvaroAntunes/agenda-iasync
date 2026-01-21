"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/#')) {
      e.preventDefault();
      const sectionId = href.substring(1); // Remove o '/'
      
      // Se estiver em outra página, redireciona para home
      if (window.location.pathname !== '/') {
        sessionStorage.setItem('scrollToSection', sectionId);
        window.location.href = '/';
      } else {
        // Se já estiver na home, faz scroll direto
        const element = document.querySelector(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      
      // Fecha o menu mobile se estiver aberto
      setIsOpen(false);
    }
  };

  const navLinks = [
    { name: "Solução", href: "/#solucao" },
    { name: "Recursos", href: "/#recursos" },
    { name: "Planos", href: "/#planos" },
    { name: "Contato", href: "/contato" },
    { name: "Sobre Nós", href: "/sobre-nos" },
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
          <a 
            href="/" 
            onClick={(e) => {
              e.preventDefault();
              if (window.location.pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                window.location.href = '/';
              }
            }}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <div className="w-14 h-14 flex items-center justify-center overflow-hidden">
              <Image 
                src="/logo.png" 
                alt="Agenda IASync Logo" 
                width={64} 
                height={64}
                className="object-cover"
              />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight group-hover:text-cyan-600 transition-colors">
              Agenda IASync
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
                  onClick={(e) => handleScrollTo(e, link.href)}
                  className={`text-sm transition-colors font-medium cursor-pointer ${
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
              href="/cadastro"
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
                      onClick={(e) => handleScrollTo(e, link.href)}
                      className={`px-4 py-3 rounded-xl transition-colors font-medium cursor-pointer ${
                        isActive
                          ? 'text-cyan-700 bg-cyan-50 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {link.name}
                    </a>
                  );
                })}
    
                <Link
                  href="/login"
                  className="mt-2 inline-flex items-center justify-center bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-full text-sm font-medium cursor-pointer hover:from-cyan-600 hover:to-blue-600"
                >
                  Entrar
                </Link>

                <Link
                  href="/cadastro"
                  className="mt-2 inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold text-cyan-700 text-center border border-cyan-200/70 bg-white/90 hover:bg-white cursor-pointer transition-colors"
                >
                  Teste Grátis
                </Link>
                         
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
