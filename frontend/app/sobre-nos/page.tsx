"use client";

import { motion } from "framer-motion";
import { Sparkles, Target, Users, Heart, Award, TrendingUp, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SobreNosPage = () => {
  const valores = [
    {
      icon: Heart,
      title: "Excelência",
      description: "Comprometidos em entregar a mais alta qualidade em cada interação."
    },
    {
      icon: Users,
      title: "Humanização",
      description: "Tecnologia que valoriza o relacionamento humano e a empatia."
    },
    {
      icon: Shield,
      title: "Confiabilidade",
      description: "Segurança e privacidade dos dados como prioridade absoluta."
    },
    {
      icon: TrendingUp,
      title: "Inovação",
      description: "Sempre à frente, trazendo soluções modernas para sua clínica."
    }
  ];

  return (
    <main className="relative">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-32">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-50 via-sky-50 to-white" />
        
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

        <div className="relative z-10 container-narrow px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-cyan-50 border border-cyan-100 
                           rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-cyan-600" strokeWidth={1.5} />
              <span className="text-sm text-cyan-700 font-medium">
                Sobre Nós
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
              Transformando o Atendimento
              <span className="text-gradient"> em Clínicas de Saúde</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 leading-relaxed mb-8 md:mb-12">
              Somos apaixonados por elevar o padrão do atendimento em clínicas que 
              não aceitam nada menos que excelência.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Nossa História */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-white" />
        
        <div className="relative z-10 container-narrow px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-cyan-50 border border-cyan-100 
                             rounded-full px-4 py-2 mb-6">
                <Target className="w-4 h-4 text-cyan-600" strokeWidth={1.5} />
                <span className="text-sm text-cyan-700 font-medium">
                  Nossa História
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-6">
                Nascemos da Necessidade Real do Mercado
              </h2>

              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  A Agenda IASync surgiu da observação de um problema recorrente: clínicas de 
                  excelência perdiam oportunidades e sobrecarregavam suas equipes com tarefas 
                  repetitivas de agendamento.
                </p>
                <p>
                  Desenvolvemos uma solução que combina a sofisticação de uma secretária executiva 
                  com a disponibilidade e precisão da Inteligência Artificial, garantindo que cada 
                  paciente receba um atendimento premium desde o primeiro contato.
                </p>
                <p>
                  Nossa missão é democratizar o acesso à tecnologia de ponta, permitindo que clínicas 
                  de todos os tamanhos ofereçam um atendimento de excelência aos seus pacientes.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-8 border border-cyan-100">
                <h3 className="text-xl font-bold text-slate-900 mb-6">
                  Por que escolher a Agenda IASync?
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-700 font-medium">Atendimento 24/7</p>
                      <p className="text-sm text-slate-600">Disponível a qualquer hora, sem pausas</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-700 font-medium">Implementação Rápida</p>
                      <p className="text-sm text-slate-600">Configure e comece a usar em minutos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-700 font-medium">Suporte Especializado</p>
                      <p className="text-sm text-slate-600">Equipe dedicada ao sucesso da sua clínica</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-700 font-medium">Tecnologia de Ponta</p>
                      <p className="text-sm text-slate-600">IA treinada para atendimento médico e odontológico</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Missão e Visão */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
        
        <div className="relative z-10 container-narrow px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Nossa Missão e Visão
            </h2>
            <p className="text-lg text-slate-600">
              Guiados por propósito e direcionados para o futuro
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100"
            >
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-cyan-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Missão</h3>
              <p className="text-slate-600 leading-relaxed">
                Capacitar clínicas de saúde a oferecer um atendimento excepcional através de 
                tecnologia inteligente, humanizada e acessível, liberando profissionais para 
                focarem no que fazem de melhor: cuidar de pessoas.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Award className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Visão</h3>
              <p className="text-slate-600 leading-relaxed">
                Ser a plataforma referência em automação inteligente de agendamentos no setor 
                de saúde, reconhecida pela excelência, inovação e pelo impacto positivo na 
                experiência de pacientes e profissionais.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Nossos Valores */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-white" />
        
        <div className="relative z-10 container-narrow px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Nossos Valores
            </h2>
            <p className="text-lg text-slate-600">
              Princípios que guiam cada decisão e ação
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {valores.map((valor, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 border border-slate-100 hover:border-cyan-200 transition-colors"
              >
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-4">
                  <valor.icon className="w-6 h-6 text-cyan-600" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{valor.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{valor.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 to-blue-100" />
        
        {/* Noise texture */}
        <div className="absolute inset-0 noise-bg opacity-[0.03]" />

        <div className="relative z-10 container-narrow px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-6">
              Pronto para Elevar o
            <span className="text-gradient"> Padrão da Sua Clínica?</span>
            </h2>
            <p className="text-lg text-slate-700 mb-8 leading-relaxed">
              Faça parte da nova geração de clínicas que utilizam IA para oferecer atendimento excepcional.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="/cadastro"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full font-semibold 
                         hover:from-cyan-700 hover:to-blue-700 transition-colors shadow-lg cursor-pointer inline-flex items-center justify-center"
              >
                Começar Agora
              </motion.a>
              <motion.a
                href="/contato"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-transparent border-2 border-slate-300 text-cyan-700 rounded-full 
                         font-semibold hover:bg-white/50 transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                Falar com Especialista
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default SobreNosPage;
