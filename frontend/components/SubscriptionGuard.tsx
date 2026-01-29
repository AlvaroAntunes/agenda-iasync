"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"
import { logger } from "@/lib/logger"


export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = getSupabaseBrowserClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isAllowed, setIsAllowed] = useState(false)

  useEffect(() => {
    checkSubscription()
  }, [pathname]) 

  function toDateOnly(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }

      // 1. Busca perfil para pegar o ID da clínica
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user.id)
        .single()

      if (!profile?.clinic_id) {
        setIsLoading(false)
        return
      }

      // 2. Busca assinatura, plano e status da IA
      const { data: assinatura } = await supabase
        .from('assinaturas')
        .select('*, planos(nome)') // Faz join para pegar o nome do plano
        .eq('clinic_id', profile.clinic_id)
        .order('data_fim', { ascending: false })
        .limit(1)
        .single()

      // Buscar status da IA da clínica (apenas se necessário)
      const { data: clinica } = await supabase
        .from('clinicas')
        .select('ia_ativa')
        .eq('id', profile.clinic_id)
        .single()

      // LÓGICA CENTRALIZADA DE BLOQUEIO
      if (assinatura) {
        const status = assinatura.status 
        const planName = assinatura.planos?.nome || 'unknown'      
        const hojeDateOnly = toDateOnly(new Date());
        const dataFimDateOnly = toDateOnly(new Date(assinatura.data_fim));

        // Lógica especial para cancelada: só bloqueia se hoje > data_fim
        if (status === 'cancelada' && dataFimDateOnly) {
          if (hojeDateOnly <= dataFimDateOnly) {
            // Ainda dentro do prazo, permite acesso
            setIsAllowed(true)
            setIsLoading(false)
            return
          } 
          else if (clinica?.ia_ativa) {
            supabase
              .from('clinicas')
              .update({ ia_ativa: false })
              .eq('id', profile.clinic_id)
              .then(() => {
                logger.log(`🔒 IA desativada para clínica ${profile.clinic_id} (data_fim passou)`)
              })
              .catch((error: any) => {
                logger.error('Erro ao desativar IA:', error)
              })
          }
        }

        // Se o status for problemático
        if (status === 'inativa' || status === 'cancelada' || status === 'pendente') {
          // Se estamos nas páginas de pagamento, PERMITE renderizar para não criar loop infinito
          if (pathname.includes('/renovar-assinatura') || pathname.includes('/pagamento-pendente') || pathname.includes('/dashboard/planos') || pathname.includes('/planos')) {
            setIsAllowed(true)
            setIsLoading(false)
            return
          }

          // Redirecionamento forçado
          if (status === 'cancelada') {
            // Assinatura cancelada -> vai para planos para escolher novo plano
            router.push('/dashboard/planos')
          } else if (planName === 'trial') {
            router.push('/renovar-assinatura') // Trial acabou -> vai pagar
          } else {
            router.push('/pagamento-pendente') // Plano normal deu ruim -> resolver pendência
          }
          return 
        }
      }

      // Se passou por tudo, está liberado
      setIsAllowed(true)
      
    } catch (error) {
      console.error("Erro ao verificar assinatura:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
          <p className="text-slate-500 font-medium">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  // Se não estiver permitido (e o router.push ainda não aconteceu), não renderiza nada
  if (!isAllowed) return null

  // Se estiver tudo ok, renderiza a página normalmente
  return <>{children}</>
}