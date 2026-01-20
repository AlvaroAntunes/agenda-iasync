"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Check, Clock, MessageCircle, LogOut, Sparkles } from "lucide-react"

export default function RenovarAssinaturaPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [clinicData, setClinicData] = useState<{ nome: string; telefone: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    loadClinicData()
  }, [])

  const loadClinicData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user.id)
        .single()

      if (!profile?.clinic_id) {
        router.push('/login')
        return
      }

      const { data: clinic } = await supabase
        .from('clinicas')
        .select('nome, telefone, status_assinatura')
        .eq('id', profile.clinic_id)
        .single()

      // Se a assinatura está ativa, redirecionar para o dashboard
      if (clinic?.status_assinatura === 'ativa') {
        setShouldRedirect(true)
        router.push('/dashboard')
        return
      }

      setClinicData(clinic)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleRenovarWhatsApp = () => {
    const message = `Olá! Gostaria de renovar a assinatura da clínica ${clinicData?.nome || 'minha clínica'}. Poderia me ajudar?`
    const whatsappUrl = `https://wa.me/5527996887194?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading || shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cyan-50 via-white to-cyan-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    )
  }

  // Se não tem dados da clínica, não mostrar conteúdo
  if (!clinicData) {
    return null
  }

  const benefits = [
    "Dashboard completo para gestão da clínica",
    "Agendamentos via WhatsApp com IA",
    "Assistente inteligente 24/7 para seus pacientes",
    "Sincronização automática com Google Calendar",
    "Gestão completa de profissionais e horários",
    "E muito mais..."
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background com gradiente suave */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-50 via-white to-cyan-50" />
      
      {/* Padrão de grid sutil */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(6 182 212) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Elementos decorativos */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-cyan-500 rounded-full blur-[120px] opacity-10"
      />
      <motion.div
        animate={{ 
          scale: [1.1, 1, 1.1],
          opacity: [0.08, 0.12, 0.08]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-blue-400 rounded-full blur-[100px] opacity-10"
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 py-8 sm:py-12">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 sm:mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
              className="inline-flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 shadow-2xl shadow-cyan-500/30 mb-4 sm:mb-6"
            >
              <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-white" strokeWidth={1.5} />
            </motion.div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-cyan-950 tracking-tight mb-3 sm:mb-4 px-2">
              Seu Período de Teste
              <span className="text-gradient block mt-1 sm:mt-2">Chegou ao Fim</span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-cyan-900/70 max-w-2xl mx-auto px-2">
              Continue automatizando sua clínica e oferecendo a melhor experiência para seus pacientes
            </p>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8"
          >
            {/* Card de Informações */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-100/60 p-6 sm:p-8">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-cyan-50 border border-cyan-200 rounded-full mb-3 sm:mb-4">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-600" />
                  <span className="text-xs sm:text-sm font-semibold text-cyan-900">Clínica Cadastrada</span>
                </div>
                {clinicData && (
                  <h2 className="text-xl sm:text-2xl font-bold text-cyan-950 break-words">{clinicData.nome}</h2>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-cyan-900 mb-3 sm:mb-4">
                  Continue com acesso completo a:
                </h3>
                
                <ul className="space-y-2.5 sm:space-y-3">
                  {benefits.map((benefit, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                      className="flex items-start gap-2.5 sm:gap-3"
                    >
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-600" strokeWidth={2.5} />
                      </div>
                      <span className="text-xs sm:text-sm text-cyan-900/80 leading-relaxed">{benefit}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Card de Ação */}
            <div className="bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 rounded-2xl shadow-2xl shadow-cyan-500/30 p-6 sm:p-8 text-white">
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                Renove Agora e Continue Crescendo
              </h3>
              
              <p className="text-white/90 mb-5 sm:mb-6 text-base sm:text-lg">
                Nossa equipe está pronta para reativar sua assinatura imediatamente.
              </p>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 sm:p-6 mb-5 sm:mb-6 border border-white/20">
                <div className="text-xs sm:text-sm text-white/80 mb-2">Investimento que se paga</div>
                <div className="text-2xl sm:text-3xl font-bold mb-1">A partir de R$ 297</div>
                <div className="text-sm sm:text-base text-white/80">/mês</div>
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/20">
                  <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-white/90">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>Setup gratuito</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>Suporte prioritário</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>Cancele quando quiser</span>
                    </li>
                  </ul>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleRenovarWhatsApp}
                  className="w-full h-12 sm:h-14 bg-white text-cyan-900 hover:bg-cyan-50 font-semibold text-base sm:text-lg shadow-xl"
                  size="lg"
                >
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                  <span className="truncate">Falar com Especialista</span>
                </Button>
              </motion.div>

              <p className="text-center text-xs sm:text-sm text-white/70 mt-3 sm:mt-4">
                Resposta em minutos • Disponível agora
              </p>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center"
          >
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair da conta
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
