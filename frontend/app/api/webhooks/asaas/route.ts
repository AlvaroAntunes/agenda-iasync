import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Webhook do Asaas para confirmar pagamentos
// Documentação: https://docs.asaas.com/reference/webhooks

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    console.log('📩 Webhook Asaas recebido:', body)

    const { event, payment } = body

    if (!payment || !payment.id) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Criar cliente Supabase com service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Buscar pagamento no banco pelo ID do Asaas
    const { data: paymentRecord, error: findError } = await supabaseAdmin
      .from('pagamentos')
      .select('*')
      .eq('id_gateway_pagamento', payment.id)
      .single()

    if (findError || !paymentRecord) {
      console.error('❌ Pagamento não encontrado:', payment.id)
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    // Processar evento
    switch (event) {
      case 'PAYMENT_RECEIVED': // Pagamento confirmado
      case 'PAYMENT_CONFIRMED': {
        console.log('✅ Pagamento confirmado:', payment.id)

        // Atualizar status do pagamento
        await supabaseAdmin
          .from('pagamentos')
          .update({
            status: 'pago',
            pago_em: new Date().toISOString(),
          })
          .eq('id', paymentRecord.id)

        // Ativar plano da clínica
        const periodStart = new Date()
        const periodEnd = new Date()
        
        if (paymentRecord.ciclo_cobranca === 'mensal') {
          periodEnd.setMonth(periodEnd.getMonth() + 1)
        } else {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        }

        await supabaseAdmin
          .from('clinicas')
          .update({
            plano: paymentRecord.plano,
            status_assinatura: 'ativa',
            inicio_periodo_atual: periodStart.toISOString(),
            fim_periodo_atual: periodEnd.toISOString(),
            trial_ends_at: null,
          })
          .eq('id', paymentRecord.clinica_id)

        console.log('🎉 Plano ativado para clínica:', paymentRecord.clinica_id)
        break
      }

      case 'PAYMENT_OVERDUE': { // Pagamento vencido
        console.log('⚠️ Pagamento vencido:', payment.id)

        await supabaseAdmin
          .from('pagamentos')
          .update({ status: 'falhou' })
          .eq('id', paymentRecord.id)

        // Marcar assinatura como vencida se estava ativa
        await supabaseAdmin
          .from('clinicas')
          .update({ status_assinatura: 'vencida' })
          .eq('id', paymentRecord.clinica_id)
          .eq('status_assinatura', 'ativa')

        break
      }

      case 'PAYMENT_DELETED': // Pagamento cancelado
      case 'PAYMENT_REFUNDED': { // Pagamento reembolsado
        console.log('🔄 Pagamento cancelado/reembolsado:', payment.id)

        const newStatus = event === 'PAYMENT_REFUNDED' ? 'reembolsado' : 'falhou'
        
        await supabaseAdmin
          .from('pagamentos')
          .update({ status: newStatus })
          .eq('id', paymentRecord.id)

        // Se tinha plano ativo, cancelar
        if (event === 'PAYMENT_REFUNDED') {
          await supabaseAdmin
            .from('clinicas')
            .update({ status_assinatura: 'cancelada' })
            .eq('id', paymentRecord.clinica_id)
        }

        break
      }

      default:
        console.log('ℹ️ Evento não processado:', event)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('💥 Erro ao processar webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}
