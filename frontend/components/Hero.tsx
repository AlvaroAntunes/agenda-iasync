"use client";

import { motion } from "framer-motion";
import { Play, ArrowRight, Shield, Clock, Users, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link"

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-50 via-sky-50 to-cyan-50" />
      
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
        className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500 rounded-full blur-[120px] opacity-10"
      />
      <motion.div
        animate={{ 
          scale: [1.1, 1, 1.1],
          opacity: [0.08, 0.12, 0.08]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-slate-400 rounded-full blur-[100px] opacity-10"
      />

      <div className="relative z-10 container-narrow px-6 pt-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 
                           rounded-full px-4 py-2 mb-6 border-blue-600/30">
              <Sparkles className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
              <span className="text-sm text-blue-700 font-medium">
                Inteligência Artificial Para Sua Clínica
              </span>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-6"
          >
            A Excelência no Atendimento
            <br />
            <span className="text-gradient">que a Sua Clínica Merece</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Automatize o agendamento de pacientes com a elegância 
            de uma secretária executiva e a precisão da Inteligência Artificial.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href="/#solucao">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary flex items-center gap-3 group w-full sm:w-auto min-w-[200px] justify-center cursor-pointer bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-600" 
                          
              >
                Conhecer a Solução
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
              </motion.button>
            </Link>
            
            <Link href="/cadastro">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-secondary flex items-center gap-3 w-full sm:w-auto min-w-[200px] justify-center cursor-pointer text-cyan-600"
              >
                Teste grátis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
              </motion.button>
            </Link>

            </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 md:gap-10 pb-6"
          >
            {[
              { icon: Shield, text: "Dados 100% Seguros" },
              { icon: Clock, text: "Resposta em Segundos" },
              { icon: Users, text: "Suporte Premium" },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-slate-500">
                <item.icon className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
