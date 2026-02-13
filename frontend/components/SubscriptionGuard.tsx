"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"
import { logger } from "@/lib/logger"
import { serverFetch } from "@/actions/api-proxy"


export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = getSupabaseBrowserClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isAllowed, setIsAllowed] = useState(false)

  useEffect(() => {
    checkSubscription()
  }, [pathname])


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
        const hoje = new Date();
        const dataFim = new Date(assinatura.data_fim);

        // Se estiver ativa mas data_fim já passou
        if (status === 'ativa' && dataFim && hoje > dataFim) {
          setIsLoading(true) // Mostra loader enquanto resolve no backend

          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""

            // 1. Tenta sincronizar primeiro (Downgrade/Upgrade agendado)
            const syncRes = await serverFetch(`${apiUrl}/subscriptions/sync/${profile.clinic_id}`, { method: 'POST' })
            const syncData = syncRes.data

            if (syncData.status === 'switched') {
              // Se trocou de plano, recarrega para atualizar o estado da assinatura
              window.location.reload()
              return
            }

            // 2. Se não houve troca de plano, verifica se a assinatura atual expirou
            // Isso só será executado se o 'if' acima for falso e não entrar no 'return'
            const expRes = await serverFetch(`${apiUrl}/subscriptions/check-expiration/${profile.clinic_id}`, { method: 'POST' })
            const expData = expRes.data

            if (expData.status === 'expired' && planName !== 'trial') {
              window.location.href = '/pagamento-pendente'
              return
            }
            else if (expData.status === 'expired') {
              window.location.href = '/renovar-assinatura'
              return
            }
          } catch (err) {
            console.error("Erro ao processar expiração/sync:", err)
          }

          // Bloqueia preventivamente se nada acima resolveu mas continua expirado
          router.push('/renovar-assinatura')
          setIsLoading(false)
          return
        }

        // Lógica especial para cancelada: só bloqueia se hoje > data_fim
        if (status === 'cancelada' && dataFim) {
          if (hoje <= dataFim) {
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
      logger.error("Erro ao verificar assinatura:", error)
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