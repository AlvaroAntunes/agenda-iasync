"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Pricing from "@/components/Pricing"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrialBanner } from "@/components/TrialBanner"
import { logger } from '@/lib/logger'
import { ClinicHeader } from "@/components/Header"

type ClinicData = {
  id: string
  nome: string
  assinatura?: {
    plan_id: string
    status: string
    plano: {
      nome: string
    }
  }
}

export default function PlanosPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null) // Controla o loading do botão
  const [isWaitingPayment, setIsWaitingPayment] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
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
        router.push('/dashboard')
        return
      }

      const { data: clinicData, error: clinicError } = await supabase
        .from('clinicas')
        .select(`
          id, 
          nome, 
          assinatura:assinaturas!clinic_id(
            plan_id,
            status,
            plano:planos!plan_id(nome)
          )
        `)
        .eq('id', profile.clinic_id)
        .single()

      if (clinicError) throw clinicError

      const assinaturas = clinicData.assinatura as any;
      const activeSubscription = Array.isArray(assinaturas)
        ? assinaturas[0]
        : assinaturas;

      setClinic({
        id: clinicData.id,
        nome: clinicData.nome,
        assinatura: activeSubscription
      })

    } catch (error) {
      logger.error('Erro ao carregar dados:', error)
      setError('Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  // Lógica de Polling (Espera Ativa)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isWaitingPayment && clinic?.id) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${apiUrl}/checkout/status/${clinic.id}`);
          const data = await res.json();

          if (data.status === 'ativa' || data.status === 'active') {
            clearInterval(interval);
            setIsWaitingPayment(false);
            window.location.href = "/dashboard";
          }
        } catch (error) {
          console.error("Polling error", error);
        }
      }, 3000); 
    }

    return () => clearInterval(interval);
  }, [isWaitingPayment, clinic?.id]);

  const handleCheckout = async (planId: string, billingPeriod: "mensal" | "anual", parcelas_cartao: number) => {
    if (!clinic?.id) return

    try {
      setProcessingPlanId(planId) // Ativa loading no Pricing
      setError("")

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""

      const response = await fetch(`${apiUrl}/checkout/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: planId,      
          periodo: billingPeriod, 
          clinic_id: clinic.id,
          parcelas_cartao: parcelas_cartao
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Erro ao gerar pagamento")
      }

      if (data.url) {
        window.open(data.url, '_blank') // Abre em nova aba
        setIsWaitingPayment(true) // Ativa o modal de espera
      }

    } catch (error: any) {
      logger.error("Checkout error:", error)
      setError(error.message || "Erro ao iniciar o pagamento.")
      alert("Erro ao iniciar pagamento: " + error.message) // Feedback rápido
    } finally {
      setProcessingPlanId(null)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setClinic(null)
    router.push('/')
  }

  // Modal de Espera
  if (isWaitingPayment) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-100 via-white to-blue-200 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md mx-4 border border-blue-100 relative">
          <div className="flex flex-col items-center mb-4">
            <div className="animate-spin w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full mb-2 shadow-lg"></div>
            <span className="absolute top-6 right-6 text-blue-400 animate-pulse">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 2v2m0 16v2m8-10h2M2 12H4m15.07 7.07l1.41 1.41M4.93 4.93L3.52 3.52m15.07-1.41l-1.41 1.41M4.93 19.07l-1.41 1.41"/></svg>
            </span>
          </div>
          <h3 className="text-2xl font-extrabold text-blue-700 mb-2 tracking-tight">Aguardando Pagamento...</h3>
          <p className="text-gray-600 mb-6 text-base">
            A guia de pagamento foi aberta em uma nova aba.<br />
            Assim que concluir, esta página atualizará automaticamente.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-2 mb-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-md cursor-pointer"
          >
            Já paguei, mas não atualizou?
          </button>
          <button 
            onClick={() => setIsWaitingPayment(false)}
            className="w-full py-1 text-xs text-gray-400 hover:text-blue-600 underline transition-colors cursor-pointer"
          >
            Cancelar espera
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader clinicName={clinic?.nome} onSignOut={handleSignOut} />

      <main className="container mx-auto px-6 py-8">
        {clinic?.id && (
          <TrialBanner clinicId={clinic.id} blockAccess={false} />
        )}
        <Card>
          <CardHeader>
            <CardTitle>Gerir Plano</CardTitle>
            <CardDescription>Escolha ou atualize o plano da sua clínica</CardDescription>
          </CardHeader>
          <CardContent>
            <Pricing
              title="Escolha o plano ideal"
              description="Atualize o seu plano para desbloquear mais recursos."
              hideGuarantee
              ctaText="Selecionar"
              disableHighlight
              currentPlanId={clinic?.assinatura?.plano?.nome} // Ex: 'consultorio'
              compact
              onPlanSelect={handleCheckout} // Passa a função aqui
              clinicId={clinic?.id}
              loadingPlanId={processingPlanId} // Passa o estado de loading
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}