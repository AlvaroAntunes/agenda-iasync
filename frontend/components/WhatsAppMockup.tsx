"use client";

import { motion } from "framer-motion";
import { Check, CheckCheck, Sparkles } from "lucide-react";

const WhatsAppMockup = () => {
  const messages = [
    {
      sender: "patient",
      text: "Olá, boa tarde! Gostaria de agendar uma consulta com o Dr. Roberto para essa semana.",
      time: "10:32",
    },
    {
      sender: "ai",
      text: "Oi, Maria! 😊 Você prefere algum dia específico desta semana para a consulta com o Dr. Roberto?",
      time: "10:32",
    },
    {
      sender: "patient",
      text: "Quinta às 14h está perfeito!",
      time: "10:33",
    },
    {
      sender: "ai",
      text: "A consulta de avaliação com o Dr. Roberto custa R$ 150,00, Maria. Posso confirmar quinta, 22/01 às 14h para você?",
      time: "10:33",
    },
    {
      sender: "patient",
      text: "Pode sim",
      time: "10:33",
    },
    {
      sender: "ai",
      text: "Prontinho, Maria! Consulta com o Dr. Roberto confirmada para quinta, 22/01 às 14h.\n 📍 Av. Brasil, 1500 - 12º andar, Rio de Janeiro/RJ.\n Qualquer coisa, estou por aqui!😊",
      time: "10:33",
    },
  ];

  return (
    <section id="solucao" className="section-padding relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/50 to-white" />

      <div className="relative z-10 container-narrow">
        <div className="grid lg:grid-cols-2 gap-16 items-center text-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 
                           rounded-full px-4 py-2 mb-6 border-blue-600/30">
              <Sparkles className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
              <span className="text-sm text-blue-700 font-medium">
                Inteligência Artificial Para Sua Clínica
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-6">
              Atendimento VIP no WhatsApp,
              <br />
              <span className="text-slate-500">24 horas por dia</span>
            </h2>

            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              A nossa IA foi treinada para representar a sua clínica com a mesma 
              sofisticação que os seus pacientes esperam. Linguagem refinada, 
              respostas rápidas e agendamento impecável.
            </p>

            <div className="space-y-4">
              {[
                "Linguagem personalizada para sua marca",
                "Confirmações e lembretes automáticos",
                "Gestão de múltiplos profissionais",
                "Integração com sua agenda existente",
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 bg-cyan-200 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-cyan-600" strokeWidth={2.5} />
                  </div>
                  <span className="text-slate-700 font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            {/* Phone Frame */}
            <div className="relative mx-auto max-w-[320px]">
              {/* Glow effect behind phone */}
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-slate-400/20 
                              rounded-[50px] blur-[60px] scale-90 -z-10" />
              
              {/* Phone body */}
              <div className="bg-slate-900 rounded-[48px] p-3 shadow-2xl 
                              ring-1 ring-slate-700/50">
                {/* Screen bezel */}
                <div className="bg-slate-950 rounded-[40px] overflow-hidden">
                  {/* Dynamic Island */}
                  <div className="flex justify-center pt-3 pb-2 bg-slate-950">
                    <div className="w-24 h-6 bg-black rounded-full" />
                  </div>

                  {/* WhatsApp Header */}
                  <div className="bg-slate-800 px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 
                                    rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        Clínica Renascer
                      </p>
                      <p className="text-slate-400 text-xs">online agora</p>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="bg-[#0b141a] p-3 space-y-2 min-h-[400px]">
                    {/* Background pattern */}
                    <div 
                      className="absolute inset-0 opacity-[0.03]"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                      }}
                    />
                    
                    {messages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: index * 0.15 }}
                        className={`flex ${msg.sender === "patient" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-3 py-2 ${
                            msg.sender === "patient"
                              ? "bg-[#005c4b] text-white rounded-tr-sm"
                              : "bg-[#202c33] text-white rounded-tl-sm"
                          }`}
                        >
                          <p className="text-[13px] leading-relaxed whitespace-pre-line">
                            {msg.text}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] text-slate-400">{msg.time}</span>
                            {msg.sender === "patient" && (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-400" strokeWidth={2} />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Input area */}
                  <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2">
                    <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
                      <span className="text-slate-500 text-sm">Mensagem</span>
                    </div>
                    <div className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 14.016l5.016-5.016-1.406-1.406-2.59 2.578V3.984h-2.04v6.188L8.39 7.594 6.984 9l5.016 5.016zm-7.031 6.984v-2.016h14.062V21H4.969zM6.984 9l5.016 5.016L17.016 9l-1.406-1.406-2.59 2.578V3.984h-2.04v6.188L8.39 7.594 6.984 9z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reflection effect */}
              <div className="absolute inset-x-0 -bottom-12 h-24 bg-gradient-to-t from-transparent 
                              to-slate-900/10 blur-xl rounded-full mx-8" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WhatsAppMockup;
