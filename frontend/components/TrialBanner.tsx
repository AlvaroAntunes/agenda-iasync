"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, Crown } from 'lucide-react'
import { checkTrialStatus, type TrialStatus } from '@/lib/check-trial'
import { logger } from '@/lib/logger'

interface TrialBannerProps {
  clinicId: string
  blockAccess?: boolean // Se true, bloqueia acesso quando expirado
}

export function TrialBanner({ clinicId, blockAccess = false }: TrialBannerProps) {
  const router = useRouter()
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrialStatus()
  }, [clinicId])

  const loadTrialStatus = async () => {
    try {
      const status = await checkTrialStatus(clinicId)
      setTrialStatus(status)

      // Se trial expirou e deve bloquear acesso
      if (blockAccess && status.isExpired) {
        router.push('/upgrade')
      }
    } catch (error) {
      logger.error('Erro ao carregar status do trial:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !trialStatus) return null

  // Não mostrar nada se não está em trial
  if (!trialStatus.isExpired && !trialStatus.showWarning) return null

  // Trial expirado
  if (trialStatus.isExpired) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>Período de teste expirado!</strong>
            <p className="text-sm mt-1">
              Seu período de teste gratuito terminou. Faça upgrade para continuar usando todas as funcionalidades.
            </p>
          </div>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => router.push('/upgrade')}
            className="ml-4"
          >
            <Crown className="h-4 w-4 mr-2" />
            Fazer Upgrade
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Aviso de trial próximo ao fim
  if (trialStatus.showWarning) {
    return (
      <Alert className="mb-4 border-amber-200 bg-amber-50">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong className="text-amber-900">
              {trialStatus.daysRemaining === 1 
                ? 'Último dia de teste grátis!' 
                : `Faltam ${trialStatus.daysRemaining} dias do seu teste grátis`}
            </strong>
            <p className="text-sm mt-1 text-amber-800">
              Faça upgrade agora e continue aproveitando todas as funcionalidades sem interrupção.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/upgrade')}
            className="ml-4 border-amber-300 hover:bg-amber-100"
          >
            <Crown className="h-4 w-4 mr-2" />
            Ver Planos
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
