"use client";

import { motion } from "framer-motion";
import { 
  Calendar, 
  Bell, 
  BarChart3, 
  Globe, 
  Lock, 
  Zap,
  Smartphone,
  Users
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Calendar,
      title: "Integração Premium",
      description: "Sincroniza automaticamente com Google Calendar ou Outlook Calendar, além da possibilidade de integrar com seu sistema de gestão atual.",
      size: "large",
      gradient: "from-blue-50 to-slate-50",
    },
    {
      icon: Smartphone,
      title: "Zero Atrito",
      description: "O seu paciente não precisa instalar nada. A conversa acontece no WhatsApp que ele já utiliza.",
      size: "small",
      gradient: "from-emerald-50 to-slate-50",
    },
    {
      icon: BarChart3,
      title: "Relatórios de Gestão",
      description: "Dashboards executivos com métricas de conversão, horários de pico e ROI da sua agenda.",
      size: "small",
      gradient: "from-slate-100 to-slate-50",
    },
    {
      icon: Bell,
      title: "Lembretes Inteligentes",
      description: "Reduza faltas em até 40% com lembretes personalizados 24h e 2h antes da consulta.",
      size: "medium",
      gradient: "from-amber-50 to-slate-50",
    },
    {
      icon: Lock,
      title: "Segurança LGPD",
      description: "Dados criptografados, servidores no Brasil e conformidade total com a LGPD.",
      size: "medium",
      gradient: "from-slate-100 to-slate-50",
    },
    {
      icon: Users,
      title: "Multi-Profissionais",
      description: "Gerencie a agenda de toda a equipe em um só lugar, com permissões individuais.",
      size: "small",
      gradient: "from-violet-50 to-slate-50",
    },
    {
      icon: Zap,
      title: "Resposta Rápida",
      description: "Atendimento 24/7 com tempo médio de resposta inferior a 20 segundos.",
      size: "small",
      gradient: "from-yellow-50 to-slate-50",
    },
  ];

  return (
    <section id="recursos" className="section-padding relative">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-50 via-sky-50 to-cyan-50" />

      <div className="relative z-10 container-narrow">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Recursos Projetados para
            <span className="text-gradient"> Clínicas de Alta Performance</span>
          </h2>
          <p className="text-lg text-slate-600">
            Cada funcionalidade foi pensada para elevar a experiência dos seus 
            pacientes e otimizar a gestão da sua clínica.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const colSpan = feature.size === "large" ? "lg:col-span-2" : "";
            
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className={`group ${colSpan}`}
              >
                <div 
                  className={`h-full card-premium bg-gradient-to-br ${feature.gradient} 
                              hover:shadow-xl hover:border-slate-300/80`}
                >
                  <div className="flex flex-col h-full">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center 
                                    shadow-soft mb-5 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    
                    <p className="text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Integration Logos */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-slate-400 mb-6">Integra-se com as ferramentas que você já utiliza</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {["Google Calendar", "Outlook Calendar"].map((name) => (
              <div 
                key={name}
                className="text-slate-300 font-semibold text-sm tracking-wide 
                           hover:text-slate-500 transition-colors cursor-default"
              >
                {name}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
