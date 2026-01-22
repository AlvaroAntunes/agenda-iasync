"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
  plano: string
  status_assinatura: string
}

export default function UpgradePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const [plans, setPlans] = useState<Plan[]>([])
  const [clinic, setClinic] = useState<ClinicData | null>(null)
  const [isAnnual, setIsAnnual] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [error, setError] = useState("")

  // Rota desabilitada - apenas para testes
  useEffect(() => {
    router.push('/dashboard')
  }, [router])

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

      const { data: clinicData } = await supabase
        .from('clinicas')
        .select('id, nome, plano, status_assinatura')
        .eq('id', profile.clinic_id)
        .single()

      setClinic(clinicData)

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

  const handleUpgrade = async (planName: string) => {
    if (!clinic) return

    setProcessingPlan(planName)
    setError("")

    try {
      const response = await fetch('/api/upgrade-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: clinic.id,
          plano: planName,
          ciclo_cobranca: isAnnual ? 'anual' : 'mensal',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar upgrade')
      }

      // Redirecionar para página de pagamento ou dashboard
      router.push('/dashboard?upgraded=true')
    } catch (error: any) {
      logger.error('Erro ao fazer upgrade:', error)
      setError(error.message || 'Erro ao processar upgrade')
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

  const isPlanCurrent = (planName: string) => {
    return clinic?.plano === planName
  }

  const getPlanIcon = (planName: string) => {
    if (planName === 'enterprise') return <Crown className="h-6 w-6" />
    if (planName === 'premium') return <Zap className="h-6 w-6" />
    return <Building2 className="h-6 w-6" />
  }

  const getPlanColor = (planName: string) => {
    if (planName === 'enterprise') return 'from-purple-600 to-pink-600'
    if (planName === 'premium') return 'from-blue-600 to-cyan-600'
    return 'from-gray-600 to-gray-700'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando planos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-cyan-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold">Escolha seu Plano</h1>
          </div>
        </div>
      </header>

      <main className="container px-4 py-12 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Escolha o plano ideal para sua clínica
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Economize com o plano anual
            </p>

            {/* Toggle Mensal/Anual */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <Label htmlFor="billing-toggle" className={`text-lg ${!isAnnual ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                Mensal
              </Label>
              <Switch
                id="billing-toggle"
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                className="data-[state=checked]:bg-green-600"
              />
              <Label htmlFor="billing-toggle" className={`text-lg ${isAnnual ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                Anual
              </Label>
              {isAnnual && (
                <Badge className="bg-green-600 text-white ml-2">
                  Economize até 10%
                </Badge>
              )}
            </div>
          </motion.div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => {
            const isCurrent = isPlanCurrent(plan.nome)
            const { savings, percentage } = getSavings(plan)

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className={`relative overflow-hidden h-full ${plan.nome === 'premium' ? 'border-2 border-blue-500 shadow-xl' : ''}`}>
                  {plan.nome === 'premium' && (
                    <div className="absolute top-0 right-0">
                      <Badge className="bg-blue-600 text-white rounded-none rounded-bl-lg px-3 py-1">
                        Mais Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${getPlanColor(plan.nome)} text-white mb-4`}>
                      {getPlanIcon(plan.nome)}
                    </div>
                    <CardTitle className="text-2xl capitalize">{plan.nome}</CardTitle>
                    <CardDescription>{plan.descricao}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">
                          R$ {getPrice(plan).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-gray-500">
                          /{isAnnual ? 'ano' : 'mês'}
                        </span>
                      </div>
                      {isAnnual && (
                        <p className="text-sm text-green-600 mt-2">
                          Economize R$ {savings.toFixed(2).replace('.', ',')} ({percentage}%)
                        </p>
                      )}
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3 mb-6">
                      {plan.funcionalidades.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full"
                      variant={plan.nome === 'premium' ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(plan.nome)}
                      disabled={isCurrent || processingPlan !== null}
                    >
                      {processingPlan === plan.nome ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : isCurrent ? (
                        'Plano Atual'
                      ) : (
                        'Escolher Plano'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="text-center text-sm text-gray-600">
          <p>
            Todos os planos incluem 7 dias de teste grátis • Cancele quando quiser
          </p>
        </div>
      </main>
    </div>
  )
}
