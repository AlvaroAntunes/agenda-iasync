import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clinicId, plano, ciclo_cobranca } = body

    if (!clinicId || !plano || !ciclo_cobranca) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
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

    // Buscar informações do plano escolhido
    const { data: planData, error: planError } = await supabaseAdmin
      .from('planos')
      .select('*')
      .eq('nome', plano)
      .single()

    if (planError || !planData) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    // Calcular período de cobrança
    const now = new Date()
    const periodStart = now
    const periodEnd = new Date(now)
    
    if (ciclo_cobranca === 'mensal') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    }

    const valor = ciclo_cobranca === 'mensal' ? planData.preco_mensal : planData.preco_anual

    // Atualizar clínica com novo plano
    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update({
        plano: plano,
        ciclo_cobranca: ciclo_cobranca,
        status_assinatura: 'ativa',
        inicio_periodo_atual: periodStart.toISOString(),
        fim_periodo_atual: periodEnd.toISOString(),
        trial_ends_at: null, // Limpar trial
      })
      .eq('id', clinicId)

    if (updateError) {
      console.error('Erro ao atualizar clínica:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar plano' },
        { status: 500 }
      )
    }

    // Registrar pagamento (status 'pendente' até confirmação do gateway)
    const { error: paymentError } = await supabaseAdmin
      .from('pagamentos')
      .insert({
        clinica_id: clinicId,
        plano: plano,
        ciclo_cobranca: ciclo_cobranca,
        valor: valor,
        status: 'pendente',
        metodo_pagamento: 'manual', // Depois integrar com gateway
      })

    if (paymentError) {
      console.error('Erro ao registrar pagamento:', paymentError)
      // Não falhar a requisição por causa disso
    }

    return NextResponse.json({
      success: true,
      message: 'Plano atualizado com sucesso',
      data: {
        plano,
        ciclo_cobranca,
        valor,
        periodo: {
          inicio: periodStart,
          fim: periodEnd,
        }
      }
    })

  } catch (error: any) {
    console.error('Erro no upgrade:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
