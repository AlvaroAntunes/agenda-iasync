"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, Sparkles } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useState } from "react";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    preferredContact: "email" as "email" | "whatsapp",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({ name: "", email: "", phone: "", message: "", preferredContact: "email" });
        setTimeout(() => setSubmitStatus("idle"), 5000);
      } else {
        setSubmitStatus("error");
        setTimeout(() => setSubmitStatus("idle"), 5000);
      }
    } catch (error) {
      logger.error('Erro ao enviar mensagem:', error);
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus("idle"), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      const formatted = formatTelefone(value);
      setFormData(prev => ({ ...prev, phone: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    
    if (numbers.length === 0) return "";
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const contactInfo = [
    {
      icon: FaWhatsapp,
      title: "WhatsApp",
      value: "(27) 99688-7194",
      link: "https://wa.me/5527996887194",
      description: "Resposta em minutos"
    },
    {
      icon: Mail,
      title: "Email",
      value: "contatoiasync@gmail.com",
      link: "mailto:contatoiasync@gmail.com",
      description: "Suporte premium"
    },
    {
      icon: MapPin,
      title: "Localização",
      value: "Brasil",
      link: null,
      description: "Atendimento nacional"
    }
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-32">
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

      <div className="relative z-10 container-narrow px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-cyan-50 border border-cyan-100 
                         rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-cyan-600" strokeWidth={1.5} />
            <span className="text-sm text-cyan-700 font-medium">
              Fale Conosco
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
            Vamos Transformar Juntos
            <br />
            <span className="text-gradient">o Atendimento da Sua Clínica</span>
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed">
            Nossa equipe está pronta para responder suas dúvidas e ajudar você a escolher 
            a melhor solução para sua clínica.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Envie sua Mensagem
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 
                             focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 
                             transition-colors outline-none"
                    placeholder="Dr. João Silva"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 
                             focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 
                             transition-colors outline-none"
                    placeholder="contato@clinica.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 
                             focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 
                             transition-colors outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Preferência de Contato
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, preferredContact: "email" }))}
                      className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                        formData.preferredContact === "email"
                          ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Mail className="w-4 h-4" strokeWidth={1.5} />
                      <span className="font-medium">Email</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, preferredContact: "whatsapp" }))}
                      className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                        formData.preferredContact === "whatsapp"
                          ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <FaWhatsapp className="w-4 h-4" />
                      <span className="font-medium">WhatsApp</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                    Mensagem
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 
                             focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 
                             transition-colors outline-none resize-none"
                    placeholder="Conte-nos sobre sua clínica e suas necessidades..."
                  />
                </div>

                {submitStatus === "success" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm"
                  >
                    ✓ Mensagem enviada com sucesso! Entraremos em contato em breve.
                  </motion.div>
                )}

                {submitStatus === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm"
                  >
                    ✗ Erro ao enviar mensagem. Por favor, tente novamente ou entre em contato pelo WhatsApp.
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white 
                           py-4 px-6 rounded-xl font-semibold transition-all duration-300
                           hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" strokeWidth={2} />
                      Enviar Mensagem
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Informações de Contato
              </h2>

              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <motion.div
                    key={info.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  >
                    {info.link ? (
                      <a
                        href={info.link}
                        target={info.link.startsWith('http') ? '_blank' : undefined}
                        rel={info.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="flex items-start gap-4 p-4 rounded-xl hover:bg-cyan-50 
                                 transition-colors group cursor-pointer"
                      >
                        <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center 
                                      flex-shrink-0 group-hover:bg-cyan-200 transition-colors">
                          <info.icon className="w-6 h-6 text-cyan-700" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 mb-1">{info.title}</p>
                          <p className="text-cyan-700 font-medium mb-1">{info.value}</p>
                          <p className="text-sm text-slate-500">{info.description}</p>
                        </div>
                      </a>
                    ) : (
                      <div className="flex items-start gap-4 p-4">
                        <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <info.icon className="w-6 h-6 text-cyan-700" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 mb-1">{info.title}</p>
                          <p className="text-slate-700 font-medium mb-1">{info.value}</p>
                          <p className="text-sm text-slate-500">{info.description}</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Additional Info Card */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-8 border border-cyan-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan-700" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-slate-900">
                  Atendimento Premium
                </h3>
              </div>
              <p className="text-slate-600 leading-relaxed mb-4">
                Nossa equipe está disponível para uma demonstração personalizada 
                e consultoria gratuita sobre como a Agenda IASync pode transformar 
                o atendimento da sua clínica.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full" />
                  Resposta em até 2 horas úteis
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full" />
                  Demonstração ao vivo
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full" />
                  Consultoria sem compromisso
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
