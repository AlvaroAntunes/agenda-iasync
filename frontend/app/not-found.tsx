"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Home, Search, Sparkles } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(15 23 42) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Decorative elements */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-400 rounded-full blur-[120px] opacity-10"
      />
      <motion.div
        animate={{ 
          scale: [1.1, 1, 1.1],
          opacity: [0.08, 0.12, 0.08]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-blue-400 rounded-full blur-[100px] opacity-10"
      />

      <div className="relative z-10 container-narrow px-6 text-center">
        {/* 404 Number */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-cyan-700" strokeWidth={1.5} />
            </div>
          </div>
          
          <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 mb-4">
            404
          </h1>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Página Não Encontrada
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Desculpe, não conseguimos encontrar a página que você está procurando. 
            Ela pode ter sido movida ou não existe mais.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary flex items-center gap-3 group w-full sm:w-auto min-w-[200px] justify-center cursor-pointer"
            >
              <Home className="w-4 h-4" strokeWidth={2} />
              Voltar ao Início
            </motion.button>
          </Link>
          
          <Link href="/contato">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-secondary flex items-center gap-3 w-full sm:w-auto min-w-[200px] justify-center cursor-pointer"
            >
              <Search className="w-4 h-4" strokeWidth={2} />
              Fale Conosco
            </motion.button>
          </Link>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16"
        >
          <p className="text-sm text-slate-500 mb-4">Links Úteis</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              { name: "Recursos", href: "/#recursos" },
              { name: "Planos", href: "/#planos" },
              { name: "Contato", href: "/contato" },
            ].map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-cyan-700 hover:text-cyan-900 font-medium transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
