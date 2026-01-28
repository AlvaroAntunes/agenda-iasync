"use client";

import { motion } from "framer-motion";
import { Check, Star, Building2, Sparkles, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

type PlanFeature = string;

interface DBPlan {
  nome: string;
  preco_mensal: number;
  preco_anual: number;
  descricao: string;
  funcionalidades: PlanFeature[];
}

interface UIPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: string;
  annualPrice: string;
  period: string;
  badge?: string;
  features: string[];
  highlighted: boolean;
  cta: string;
  enterprise?: boolean;
}

interface PricingProps {
  title?: string;
  description?: string;
  hideGuarantee?: boolean;
  ctaText?: string;
  disableHighlight?: boolean;
  currentPlanId?: string;
  compact?: boolean;
  onPlanSelect?: (planId: string, period: "mensal" | "anual", parcelas_cartao: number) => void;
  clinicId?: string;
  loadingPlanId?: string | null;
}

const Pricing = ({
  title,
  description,
  hideGuarantee,
  ctaText,
  disableHighlight,
  currentPlanId,
  compact,
  onPlanSelect,
  clinicId,
  loadingPlanId // Recebe estado de loading externo
}: PricingProps) => {
  const [billingPeriod, setBillingPeriod] = useState<"mensal" | "anual">("mensal");
  const [installments, setInstallments] = useState<1 | 12>(12);
  const [plans, setPlans] = useState<UIPlan[]>([]);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .order('preco_mensal', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        return;
      }

      if (data) {
        const mappedPlans = data
          .filter((plan: DBPlan) => plan.nome !== 'trial')
          .map((plan: DBPlan) => {
            const isClinicaPro = plan.nome === 'clinica_pro';
            const isCorporate = plan.nome === 'corporate';

            let displayName = plan.nome;
            if (plan.nome === 'consultorio') displayName = 'Consultório';
            if (plan.nome === 'clinica_pro') displayName = 'Clínica Pro';
            if (plan.nome === 'corporate') displayName = 'Corporate';

            return {
              id: plan.nome,
              name: displayName,
              description: plan.descricao,
              monthlyPrice: plan.preco_mensal.toString(),
              annualPrice: plan.preco_anual.toString(),
              period: "/mês",
              badge: isClinicaPro ? "Mais Popular" : undefined,
              features: plan.funcionalidades || [],
              highlighted: isClinicaPro,
              cta: isClinicaPro ? "Escolher Clínica Pro" : "Começar Agora",
              enterprise: isCorporate,
            };
          });
        setPlans(mappedPlans);
      }
    };

    fetchPlans();
  }, []);

  const handleButtonClick = (planId: string) => {
    const finalInstallments = billingPeriod === "mensal" ? 1 : installments;

    if (onPlanSelect) {
      // Se a página pai passou uma função, usa ela (Fluxo Logado)
      onPlanSelect(planId, billingPeriod, finalInstallments);
    } else {
      window.location.href = '/cadastro';
    }
  };

  return (
    <section id="planos" className={`${compact ? "py-6" : "section-padding"} relative overflow-hidden`}>
      {/* Background */}
      {!compact && <div className="absolute inset-0 bg-gradient-to-b from-white via-cyan-50/50 to-white" />}

      <div className="relative z-10 container-narrow">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={`text-center max-w-2xl mx-auto ${compact ? "mb-8" : "mb-16"}`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-cyan-950 tracking-tight mb-4">
            {title || (<><span>Investimento que se Paga</span><span className="text-gradient"> no Primeiro Mês</span></>)}
          </h2>
          {description !== undefined ? (
            description && <p className="text-lg text-cyan-900/70">{description}</p>
          ) : (
            <p className="text-lg text-cyan-900/70">
              Escolha o plano ideal para o tamanho da sua clínica.
              Todos incluem setup gratuito e 7 dias de teste grátis.
            </p>
          )}
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center gap-8 mb-12"
        >
          {/* Main Toggle (Mensal/Anual) */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBillingPeriod("mensal")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 cursor-pointer ${billingPeriod === "mensal"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-[0_15px_35px_rgba(6,182,212,0.35)]"
                : "bg-white text-cyan-800/70 border border-cyan-100 hover:border-cyan-200"
                }`}
            >
              Mensal
            </button>
            <button
              onClick={() => {
                setBillingPeriod("anual");
                setInstallments(12); // Reset to 12x default when searching to annual
              }}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 relative cursor-pointer ${billingPeriod === "anual"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-[0_15px_35px_rgba(6,182,212,0.35)]"
                : "bg-white text-cyan-800/70 border border-cyan-100 hover:border-cyan-200"
                }`}
            >
              Anual
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                -10%
              </span>
            </button>
          </div>

          {/* Sub Toggle (À vista/Parcelado) - Only for Annual */}
          {billingPeriod === "anual" && hideGuarantee && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-center gap-2 bg-slate-100 p-1 rounded-lg"
            >
              <button
                onClick={() => setInstallments(1)}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${installments === 1
                  ? "bg-white text-cyan-700 shadow-sm"
                  : "text-slate-500 hover:text-cyan-700"
                  }`}
              >
                À vista (1x)
              </button>
              <button
                onClick={() => setInstallments(12)}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${installments === 12
                  ? "bg-white text-cyan-700 shadow-sm"
                  : "text-slate-500 hover:text-cyan-700"
                  }`}
              >
                Parcelado (até 12x sem juros)
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => {
            const isHighlighted = currentPlanId
              ? plan.id === currentPlanId
              : (plan.highlighted && !disableHighlight);

            const badgeText = currentPlanId
              ? (plan.id === currentPlanId ? "Plano atual" : null)
              : (plan.badge && !disableHighlight ? plan.badge : null);

            const hasBadge = !!badgeText;
            const isCurrentPlan = currentPlanId === plan.id;

            // Verifica se este plano específico está carregando
            const isLoading = loadingPlanId === plan.id;

            const buttonText = currentPlanId
              ? (isCurrentPlan ? "Plano atual" : "Mudar para este plano")
              : (ctaText || plan.cta);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative ${isHighlighted ? "md:-mt-4 md:mb-[-16px]" : ""}`}
              >
                {/* Badge */}
                {hasBadge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white text-xs font-semibold px-4 py-1.5 
                                  rounded-full flex items-center gap-1.5 shadow-[0_15px_30px_rgba(6,182,212,0.35)]">
                      <Star className="w-3 h-3 fill-current" />
                      {badgeText}
                    </div>
                  </div>
                )}

                <div
                  className={`h-full rounded-2xl p-8 transition-all duration-300 flex flex-col
                            ${isHighlighted
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
                      ) : isHighlighted ? (
                        <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
                      ) : null}
                      <h3 className={`text-xl font-bold ${isHighlighted ? "text-white" : "text-cyan-900"}`}>
                        {plan.name}
                      </h3>
                    </div>
                    <p className={`text-sm ${isHighlighted ? "text-white/80" : "text-cyan-900/70"}`}>
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-8 text-center">
                    {billingPeriod === "anual" && installments === 12 && (
                      <div className={`text-xs mb-1 ${isHighlighted ? "text-white/70" : plan.enterprise ? "text-cyan-900/60" : "text-cyan-900/60"}`}>
                        12x de
                      </div>
                    )}
                    {billingPeriod === "anual" && installments === 1 && (
                      <div className={`text-xs mb-1 ${isHighlighted ? "text-white/70" : plan.enterprise ? "text-cyan-900/60" : "text-cyan-900/60"}`}>
                        À vista
                      </div>
                    )}
                    <div className="flex items-baseline gap-1 justify-center">
                      <span className={`text-sm ${isHighlighted ? "text-white/80" : plan.enterprise ? "text-cyan-900/60" : "text-cyan-900/60"}`}>
                        R$
                      </span>
                      <span className={`text-5xl font-bold tracking-tight 
                                      ${isHighlighted ? "text-white" : "text-cyan-900"}`}>
                        {billingPeriod === "mensal"
                          ? plan.monthlyPrice
                          : installments === 12
                            ? (parseFloat(plan.annualPrice) / 12)
                            : parseFloat(plan.annualPrice).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                        }
                      </span>
                      {/* Show /mês only if monthly or if it's 12x annual */}
                      {(billingPeriod === "mensal" || installments === 12) && (
                        <span className={`text-sm ${isHighlighted ? "text-white/80" : plan.enterprise ? "text-cyan-900/60" : "text-cyan-900/60"}`}>
                          {plan.period}
                        </span>
                      )}
                    </div>
                    {billingPeriod === "anual" && installments === 12 && (
                      <>
                        <p className={`text-xs mt-2 ${isHighlighted ? "text-white/70" : plan.enterprise ? "text-cyan-900/60" : "text-cyan-900/60"}`}>
                          Valor total: R${(parseInt(plan.annualPrice)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className="flex justify-center mt-2">
                          <p className={`text-xs text-emerald-500 font-medium bg-emerald-100 rounded-md px-2 py-1`}>
                            Economize R${(((parseFloat(plan.monthlyPrice) * 12) - parseFloat(plan.annualPrice))).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </>
                    )}
                    {billingPeriod === "anual" && installments === 1 && (
                      <div className="flex justify-center mt-2">
                        <p className={`text-xs text-emerald-500 font-medium bg-emerald-100 rounded-md px-2 py-1`}>
                          Economize R${(((parseFloat(plan.monthlyPrice) * 12) - parseFloat(plan.annualPrice))).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8 flex-grow">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                                      ${isHighlighted
                            ? "bg-white/20"
                            : plan.enterprise
                              ? "bg-cyan-100"
                              : "bg-cyan-50"
                          }`}>
                          <Check
                            className={`w-3 h-3 ${isHighlighted
                              ? "text-white"
                              : plan.enterprise
                                ? "text-cyan-700"
                                : "text-cyan-600"
                              }`}
                            strokeWidth={2.5}
                          />
                        </div>
                        <span className={`text-sm ${isHighlighted ? "text-white/85" : "text-cyan-900/70"}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <motion.button
                    whileHover={isCurrentPlan ? {} : { scale: 1.02 }}
                    whileTap={isCurrentPlan ? {} : { scale: 0.98 }}
                    onClick={() => handleButtonClick(plan.id)}
                    disabled={isCurrentPlan || isLoading}
                    className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex justify-center items-center gap-2 ${isCurrentPlan ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                              ${isHighlighted
                        ? "bg-white text-cyan-900 hover:bg-cyan-50"
                        : plan.enterprise
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-600"
                          : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-600"
                      }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      buttonText
                    )}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Guarantee */}
        {!hideGuarantee ? (
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
        ) :
        billingPeriod == "mensal" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 text-center"
          >
            <p className="text-cyan-900/70 text-sm">
              ✓ Cancele quando quiser
            </p>
          </motion.div>
        )
      }
      </div>
    </section>
  );
};

export default Pricing;