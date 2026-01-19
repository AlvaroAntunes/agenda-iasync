import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { AsaasClient } from '@/lib/asaas-client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clinicId, plano, ciclo_cobranca, metodoPagamento } = body

    if (!clinicId || !plano || !ciclo_cobranca || !metodoPagamento) {
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

    // Buscar dados da clínica para criar cliente no Asaas
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinicas')
      .select('nome, email, cnpj, telefone, endereco, cidade, uf')
      .eq('id', clinicId)
      .single()

    if (clinicError || !clinicData) {
      return NextResponse.json(
        { error: 'Clínica não encontrada' },
        { status: 404 }
      )
    }

    // Criar cliente no Asaas
    const asaas = new AsaasClient()
    const asaasCustomer = await asaas.createOrUpdateCustomer({
      name: clinicData.nome,
      email: clinicData.email,
      cpfCnpj: clinicData.cnpj,
      phone: clinicData.telefone,
      externalReference: clinicId,
    })

    // Calcular vencimento (7 dias a partir de hoje)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)
    const dueDateStr = dueDate.toISOString().split('T')[0] // YYYY-MM-DD

    // Criar cobrança no Asaas
    const asaasPayment = await asaas.createPayment({
      customer: asaasCustomer.id!,
      billingType: metodoPagamento, // 'PIX' ou 'BOLETO'
      value: valor,
      dueDate: dueDateStr,
      description: `Plano ${plano.toUpperCase()} - ${ciclo_cobranca === 'mensal' ? 'Mensal' : 'Anual'}`,
      externalReference: clinicId,
    })

    // Registrar pagamento no banco
    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
      .from('pagamentos')
      .insert({
        clinica_id: clinicId,
        plano: plano,
        ciclo_cobranca: ciclo_cobranca,
        valor: valor,
        status: 'pendente',
        metodo_pagamento: metodoPagamento,
        id_gateway_pagamento: asaasPayment.id,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Erro ao registrar pagamento:', paymentError)
    }

    // Atualizar clínica (status ainda pendente até confirmar pagamento)
    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update({
        ciclo_cobranca: ciclo_cobranca,
        // Não ativar ainda, esperar webhook
      })
      .eq('id', clinicId)

    if (updateError) {
      console.error('Erro ao atualizar clínica:', updateError)
    }

    return NextResponse.json({
      success: true,
      message: 'Cobrança criada com sucesso',
      data: {
        paymentId: asaasPayment.id,
        status: asaasPayment.status,
        dueDate: asaasPayment.dueDate,
        valor: asaasPayment.value,
        invoiceUrl: asaasPayment.invoiceUrl,
        bankSlipUrl: asaasPayment.bankSlipUrl,
        pixQrCode: asaasPayment.pixTransaction?.qrCode,
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
