"use client"

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-client'
import { logger } from '@/lib/logger'

interface CanceledSubscriptionBannerProps {
  clinicId: string
}

export function CanceledSubscriptionBanner({ clinicId }: CanceledSubscriptionBannerProps) {
  const supabase = getSupabaseBrowserClient()
  const [isCanceled, setIsCanceled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSubscriptionStatus()
  }, [clinicId])

  const checkSubscriptionStatus = async () => {
    try {
      const { data: assinatura } = await supabase
        .from('assinaturas')
        .select('status, data_fim')
        .eq('clinic_id', clinicId)
        .order('data_fim', { ascending: false })
        .limit(1)
        .single()

      if (assinatura && assinatura.status === 'cancelada') {
        // Verifica se a data de término já passou
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const dataFim = new Date(assinatura.data_fim)
        dataFim.setHours(0, 0, 0, 0)

        if (hoje > dataFim) {
          setIsCanceled(true)
        }
      }
    } catch (error) {
      logger.error('Erro ao verificar status da assinatura:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !isCanceled) return null

  return (
    <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <strong className="text-red-900 block">Sua assinatura foi cancelada</strong>
          <p className="text-sm mt-1 text-red-800">
            Por isso você está sendo redirecionado para esta página. Escolha um novo plano para continuar usando todas as funcionalidades da plataforma.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  )
}
