"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Pricing from "@/components/Pricing"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { TrialBanner } from "@/components/TrialBanner"
import {
  Check,
  Crown,
  Zap,
  Building2,
  ArrowLeft,
  AlertCircle,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { logger } from '@/lib/logger'
import { ClinicHeader } from "@/components/Header"

type Plan = {
  id: string
  nome: string
  preco_mensal: number
  preco_anual: number
  descricao: string
  funcionalidades: string[]
}

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

  const [plans, setPlans] = useState<Plan[]>([])
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [isAnnual, setIsAnnual] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Verificar autenticação
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Carregar perfil e clínica
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

      // Tratamento para extrair apenas a primeira assinatura (se for array) ou objeto único
      // O Supabase retorna array para relações 1:N.
      const assinaturas = clinicData.assinatura as any;
      const activeSubscription = Array.isArray(assinaturas)
        ? assinaturas[0]
        : assinaturas;

      setClinic({
        id: clinicData.id,
        nome: clinicData.nome,
        assinatura: activeSubscription
      })

      // Carregar planos disponíveis
      const { data: plansData, error: plansError } = await supabase
        .from('planos')
        .select('*')
        .order('preco_mensal', { ascending: true })

      if (plansError) throw plansError

      setPlans(plansData || [])
    } catch (error) {
      logger.error('Erro ao carregar dados:', error)
      setError('Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async (planId: string, billingPeriod: string) => {
    if (!clinic?.id) return

    try {
      setProcessingPlan(planId)
      setError("")

      // Pega a URL do backend do arquivo .env.local
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""

      const response = await fetch(`${apiUrl}/checkout/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: planId,      // ID do plano (deve bater com o ID no Supabase)
          periodo: billingPeriod, // mensal ou anual
          clinic_id: clinic.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Erro ao gerar pagamento")
      }

      // Redireciona para a Fatura/Checkout do Asaas
      if (data.url) {
        window.location.href = data.url
      }

    } catch (error: any) {
      logger.error("Checkout error:", error)
      setError(error.message || "Erro ao iniciar o pagamento. Por favor, tente novamente.")
    } finally {
      setProcessingPlan(null)
    }
  }

  const getPrice = (plan: Plan) => {
    return isAnnual ? plan.preco_anual : plan.preco_mensal
  }

  const getSavings = (plan: Plan) => {
    const monthlyCost = plan.preco_mensal * 12
    const annualCost = plan.preco_anual
    const savings = monthlyCost - annualCost
    const percentage = Math.round((savings / monthlyCost) * 100)
    return { savings, percentage }
  }

  // const isPlanCurrent = (planName: string) => {
  //   return clinic?.plano === planName
  // }

  const getPlanIcon = (planName: string) => {
    if (planName === 'enterprise') return <Crown className="h-6 w-6" />
    if (planName === 'premium') return <Zap className="h-6 w-6" />
    return <Building2 className="h-6 w-6" />
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setClinic(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader clinicName={clinic?.nome} onSignOut={handleSignOut} />

      <main className="container mx-auto px-6 py-8">
        {clinic?.id && (
          <TrialBanner clinicId={clinic.id} blockAccess={false} />
        )}
        <Card>
          <CardHeader>
            <CardTitle>Planos</CardTitle>
            <CardDescription>Gerencie o plano da sua clínica</CardDescription>
          </CardHeader>
          <CardContent>

            <Pricing
              title="Escolha o plano ideal para sua clínica"
              description=""
              hideGuarantee
              ctaText="Escolher plano"
              disableHighlight
              currentPlanId={clinic?.assinatura?.plano?.nome}
              compact
              onPlanSelect={handleCheckout}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
