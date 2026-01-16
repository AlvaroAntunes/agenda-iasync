"use client";

import { motion } from "framer-motion";
import { Check, Star, Building2, Sparkles } from "lucide-react";
import { useState } from "react";

const Pricing = () => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      name: "Clinic Essential",
      description: "Ideal para consultórios individuais",
      monthlyPrice: "297",
      annualPrice: "267",
      period: "/mês",
      features: [
        "Acesso completo a plataforma",
        "Até 500 agendamentos/mês",
        "Até 2 profissionais",
        "Integrações básicas",
        "Suporte via chat",
        "Relatórios essenciais",
      ],
      highlighted: false,
      cta: "Começar Agora",
    },
    {
      name: "Clinic Pro",
      description: "A escolha dos especialistas",
      monthlyPrice: "497",
      annualPrice: "447",
      period: "/mês",
      badge: "Mais Popular",
      features: [
        "Acesso completo a plataforma",
        "Até 500 agendamentos/mês",
        "Até 5 profissionais",
        "Integrações básicas",
        "Suporte via chat",
        "Relatórios essenciais",
      ],
      highlighted: true,
      cta: "Escolher Clinic Pro",
    },
    {
      name: "Enterprise",
      description: "Para múltiplas unidades",
      monthlyPrice: "697",
      annualPrice: "627",
      period: "/mês",
      features: [
        "Acesso completo a plataforma",
        "Até 500 agendamentos/mês",
        "Até 10 profissionais",
        "Integrações básicas",
        "Suporte via chat",
        "Relatórios essenciais",
      ],
      highlighted: false,
      cta: "Falar com Especialista",
      enterprise: true,
    },
  ];

  return (
    <section id="planos" className="section-padding relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-cyan-50/50 to-white" />

      <div className="relative z-10 container-narrow">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-cyan-950 tracking-tight mb-4">
            Investimento que se Paga
            <span className="text-gradient"> no Primeiro Mês</span>
          </h2>
          <p className="text-lg text-cyan-900/70">
            Escolha o plano ideal para o tamanho da sua clínica. 
            Todos incluem setup gratuito e 7 dias de teste.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 cursor-pointer ${
              billingPeriod === "monthly"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-[0_15px_35px_rgba(6,182,212,0.35)]"
                : "bg-white text-cyan-800/70 border border-cyan-100 hover:border-cyan-200"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 relative cursor-pointer ${
              billingPeriod === "annual"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-[0_15px_35px_rgba(6,182,212,0.35)]"
                : "bg-white text-cyan-800/70 border border-cyan-100 hover:border-cyan-200"
            }`}
          >
            Anual
            <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
              -10%
            </span>
          </button>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative ${plan.highlighted ? "md:-mt-4 md:mb-[-16px]" : ""}`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white text-xs font-semibold px-4 py-1.5 
                                  rounded-full flex items-center gap-1.5 shadow-[0_15px_30px_rgba(6,182,212,0.35)]">
                    <Star className="w-3 h-3 fill-current" />
                    {plan.badge}
                  </div>
                </div>
              )}

              <div 
                className={`h-full rounded-2xl p-8 transition-all duration-300 
                            ${plan.highlighted 
                              ? "bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 text-white shadow-2xl ring-1 ring-cyan-200/60" 
                              : plan.enterprise
                                ? "bg-white border-2 border-cyan-100 shadow-lg hover:shadow-xl hover:border-cyan-200"
                                : "bg-white border border-cyan-100/60 shadow-soft hover:shadow-lg hover:border-cyan-200"
                            }`}
              >
                {/* Plan Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    {plan.enterprise ? (
                      <Building2 className="w-5 h-5 text-cyan-700" strokeWidth={1.5} />
                    ) : plan.highlighted ? (
                      <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
                    ) : null}
                    <h3 className={`text-xl font-bold ${plan.highlighted ? "text-white" : "text-cyan-900"}`}>
                      {plan.name}
                    </h3>
                  </div>
                  <p className={`text-sm ${plan.highlighted ? "text-white/80" : "text-cyan-900/70"}`}>
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-8 text-center">
                  {billingPeriod === "annual" && (
                    <div className={`text-xs mb-1 ${plan.highlighted ? "text-white/70" : plan.enterprise ? "text-cyan-900/60" : "text-cyan-900/60"}`}>
                      12x de
                    </div>
                  )}
                  <div className="flex items-baseline gap-1 justify-center">
                    <span className={`text-sm ${plan.highlighted ? "text-white/80" : plan.enterprise ? "text-cyan-900/60" : "text-cyan-900/60"}`}>
                      R$
                    </span>
                    <span className={`text-5xl font-bold tracking-tight 
                                      ${plan.highlighted ? "text-white" : "text-cyan-900"}`}>
                      {billingPeriod === "monthly" ? plan.monthlyPrice : plan.annualPrice}
                    </span>
                    <span className={`text-sm ${plan.highlighted ? "text-white/80" : plan.enterprise ? "text-cyan-900/60" : "text-cyan-900/60"}`}>
                      {plan.period}
                    </span>
                  </div>
                  {billingPeriod === "annual" && (
                    <>
                      <p className={`text-xs mt-2 ${plan.highlighted ? "text-white/70" : plan.enterprise ? "text-cyan-900/60" : "text-cyan-900/60"}`}>
                        Valor total: R${(parseInt(plan.annualPrice) * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="flex justify-center mt-2">
                        <p className={`text-xs text-emerald-500 font-medium bg-emerald-100 rounded-md px-2 py-1`}>
                          Economize R${((parseInt(plan.monthlyPrice) - parseInt(plan.annualPrice)) * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                                      ${plan.highlighted 
                                        ? "bg-white/20" 
                                        : plan.enterprise 
                                          ? "bg-cyan-100" 
                                          : "bg-cyan-50"
                                      }`}>
                        <Check 
                          className={`w-3 h-3 ${plan.highlighted 
                            ? "text-white" 
                            : plan.enterprise 
                              ? "text-cyan-700" 
                              : "text-cyan-600"
                          }`} 
                          strokeWidth={2.5} 
                        />
                      </div>
                      <span className={`text-sm ${plan.highlighted ? "text-white/85" : "text-cyan-900/70"}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 cursor-pointer
                              ${plan.highlighted
                                ? "bg-white text-cyan-900 hover:bg-cyan-50"
                                : plan.enterprise
                                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-600"
                                  : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-600"
                              }`}
                >
                  {plan.cta}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-cyan-900/70 text-sm">
            ✓ 7 dias de teste grátis &nbsp;•&nbsp; ✓ Cancele quando quiser &nbsp;•&nbsp; ✓ Setup gratuito
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
