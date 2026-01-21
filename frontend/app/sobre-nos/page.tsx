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
      description: "Sempre à frente, trazendo soluções inovadoras de IA para diversos setores."
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
              Desenvolvendo Soluções em IA
              <span className="text-gradient"> com Foco no Setor de Saúde</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 leading-relaxed mb-8 md:mb-12">
              Somos a IASync, uma empresa de software especializada em Inteligência Artificial 
              que desenvolve soluções inovadoras, com destaque para o setor de saúde.
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
                Uma Empresa de Software e IA
              </h2>

              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  A IASync é uma empresa de tecnologia especializada no desenvolvimento de soluções 
                  baseadas em Inteligência Artificial para diversos segmentos, com destaque especial 
                  para o setor de saúde, onde desenvolvemos ferramentas que otimizam processos e elevam 
                  a qualidade do atendimento.
                </p>
                <p>
                  O <strong>Agenda IASync</strong> é nosso produto principal para o setor de saúde: uma plataforma 
                  inteligente de agendamento que combina automação via IA com atendimento humanizado, liberando 
                  equipes médicas para focarem no que realmente importa - cuidar de pessoas.
                </p>
                <p>
                  Com expertise em machine learning, processamento de linguagem natural e integrações 
                  avançadas, desenvolvemos soluções personalizadas que atendem às necessidades específicas 
                  de cada cliente e mercado.
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
                  Nossa Expertise
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-700 font-medium">Inteligência Artificial</p>
                      <p className="text-sm text-slate-600">Machine Learning e NLP avançados</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-700 font-medium">Desenvolvimento de Software</p>
                      <p className="text-sm text-slate-600">Plataformas escaláveis e seguras</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-700 font-medium">Setor de Saúde (Especialização)</p>
                      <p className="text-sm text-slate-600">Soluções para clínicas médicas e odontológicas</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-700 font-medium">Inovação Contínua</p>
                      <p className="text-sm text-slate-600">Pesquisa e desenvolvimento constante</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Fundadores */}
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
              Nossos Fundadores
            </h2>
            <p className="text-lg text-slate-600">
              Uma equipe multidisciplinar unida pela paixão por tecnologia e inovação.
            </p>
          </motion.div>

          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <p className="text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto">
                A IASync foi fundada por um time de <strong>4 empreendedores</strong> com visão de 
                transformar o mercado através da Inteligência Artificial. Nossa força está na 
                diversidade de conhecimentos e experiências que cada fundador traz para a empresa.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {[
                {
                  name: "Álvaro Antunes",
                  role: "Engenharia de Computação",
                  image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alvaro&backgroundColor=b6e3f4"
                },
                {
                  name: "Pedro Fabres",
                  role: "Engenharia de Computação",
                  image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Joao&backgroundColor=c0aede"
                },
                {
                  name: "Emanuel Delpupo",
                  role: "Gestão Financeira e Segurança",
                  image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria&backgroundColor=ffd5dc"
                },
                {
                  name: "Augusto Rocha",
                  role: "Desenvolvedor Sênior",
                  image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro&backgroundColor=d1d4f9"
                }
              ].map((founder, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:border-cyan-200 transition-all hover:shadow-xl"
                >
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-cyan-50 to-blue-50 border-4 border-white shadow-md">
                    <img 
                      src={founder.image} 
                      alt={founder.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
                    {founder.name}
                  </h3>
                  <p className="text-sm text-slate-600 text-center leading-relaxed">
                    {founder.role}
                  </p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-2xl p-8 md:p-10 shadow-lg border border-slate-100"
            >
              <div className="space-y-6 text-slate-600 leading-relaxed">
                <p>
                  Nossa equipe reúne <strong>especialistas em Engenharia de Computação</strong> com profundo 
                  conhecimento em desenvolvimento de software, arquitetura de sistemas e implementação de 
                  soluções baseadas em IA, garantindo robustez técnica em cada projeto. Contamos também 
                  com expertise em <strong>gestão financeira, estratégia de negócios e segurança de dados</strong>, 
                  fundamental para entender as necessidades do mercado e garantir proteção total das informações. 
                  Completando o time, temos um <strong>desenvolvedor sênior</strong> com vasta experiência 
                  de mercado, que traz maturidade técnica e visão prática para transformar ideias em 
                  produtos reais e escaláveis.
                </p>

                <p className="pt-4">
                  Com raízes na <strong>Universidade Federal do Espírito Santo (Ufes)</strong>, nossa equipe 
                  fundadora une conhecimento técnico aprofundado com visão empreendedora prática, 
                  resultando em soluções tecnológicas que realmente agregam valor ao mercado.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Missão e Visão */}
      <section className="relative overflow-hidden">
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
              Nossa Missão e Visão
            </h2>
            <p className="text-lg text-slate-600">
              Guiados por propósito e direcionados para o futuro.
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
                Desenvolver soluções de software e Inteligência Artificial que transformam 
                processos e negócios, com foco especial no setor de saúde, tornando a gestão 
                mais eficiente e humanizada, permitindo que profissionais se dediquem ao essencial.
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
                Ser uma empresa de tecnologia referência em soluções de Inteligência Artificial, 
                reconhecida pela inovação, excelência técnica e pelo impacto positivo em diversos 
                setores, com destaque para o segmento de saúde.
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
              Princípios que guiam cada decisão e ação.
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
