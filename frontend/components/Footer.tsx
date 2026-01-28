"use client";

import { motion } from "framer-motion";
import { Sparkles, Linkedin, Instagram, Mail, Phone, Target } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa"

const Footer = () => {
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();

      // Se estiver em outra página, redireciona para home
      if (window.location.pathname !== '/') {
        // Salva o ID da seção para scroll depois
        sessionStorage.setItem('scrollToSection', href);
        window.location.href = '/';
      } else {
        // Se já estiver na home, faz scroll direto
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  };

  const footerLinks = {
    Produto: [
      { name: "Solução", href: "#solucao" },
      { name: "Recursos", href: "#recursos" },
      { name: "Planos", href: "#planos" },
    ],
    Empresa: [
      { name: "Sobre nós", href: "/sobre-nos" },
      { name: "Contato", href: "/contato" }
    ],
    Legal: [
      { name: "Política de Privacidade", href: "/politica-de-privacidade", target: "_blank" },
      { name: "Termos de Uso", href: "/termos-de-uso", target: "_blank" }
    ]
  };

  return (
    <footer id="contato" className="relative overflow-hidden bg-white text-slate-700">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0" />

      {/* Noise texture */}
      <div className="absolute inset-0 noise-bg opacity-[0.03]" />

      <div className="relative z-10">
        {/* Main Footer */}
        <div className="container-narrow px-6 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-6">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <a href="#" className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center border border-cyan-200/80">
                    <Sparkles className="w-5 h-5 text-cyan-700" strokeWidth={1.5} />
                  </div>
                  <span className="font-bold text-xl tracking-tight text-slate-900">Agenda IASync</span>
                </a>

                <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-xs">
                  Elevando o padrão do atendimento para clínicas que não aceitam nada menos que excelência.
                </p>

                {/* Social Links */}
                <div className="flex items-center gap-3">
                  {[
                    { icon: FaWhatsapp, href: "https://wa.me/5527996887194" },
                    { icon: Instagram, href: "https://www.instagram.com/ia_sync/" },
                    { icon: Mail, href: "mailto:contatoiasync@gmail.com" },
                  ].map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-white border border-cyan-100 hover:bg-cyan-50 rounded-lg 
                                 flex items-center justify-center transition-colors"
                    >
                      <social.icon className="w-4 h-4 text-cyan-700" strokeWidth={1.5} />
                    </a>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([category, links], catIndex) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: catIndex * 0.1 }}
              >
                <h4 className="font-semibold text-slate-900 mb-2">{category}</h4>
                <ul className="space-y-2">
                  {links.map((link: any) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        target={link.target}
                        onClick={(e) => handleScrollTo(e, link.href)}
                        className="text-slate-600 text-sm hover:text-cyan-700 transition-colors cursor-pointer"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200">
          <div className="container-narrow px-6 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-slate-500 text-sm">
                © {new Date().getFullYear()} Agenda IASync. Todos os direitos reservados.
              </p>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-slate-600 text-sm font-medium"
              >
                Elevando o padrão da sua clínica. ✨
              </motion.p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
