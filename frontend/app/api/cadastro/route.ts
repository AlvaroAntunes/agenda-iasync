import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      nomeClinica,
      cnpjClinica,
      telefone,
      email,
      endereco,
      cidade,
      uf,
      senha
    } = body

    // Validações básicas
    if (!nomeClinica || !cnpjClinica || !telefone || !email || !senha) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    // Criar cliente Supabase com service role (bypassa RLS)
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

    // 1. Verificar se email ou CNPJ já existem
    const { data: existingClinics, error: checkError } = await supabaseAdmin
      .from('clinicas')
      .select('email, cnpj')
      .or(`email.eq.${email},cnpj.eq.${cnpjClinica}`)

    if (checkError) {
      logger.error('Erro ao verificar duplicatas:', checkError)
      return NextResponse.json(
        { error: 'Erro ao verificar dados' },
        { status: 500 }
      )
    }

    if (existingClinics && existingClinics.length > 0) {
      const hasEmail = existingClinics.some((clinic: any) => clinic.email === email)
      const hasCNPJ = existingClinics.some((clinic: any) => clinic.cnpj === cnpjClinica)

      let errorMessage = ''
      if (hasEmail && hasCNPJ) {
        errorMessage = 'Este email e CNPJ já estão cadastrados no sistema'
      } else if (hasEmail) {
        errorMessage = 'Este email já está cadastrado no sistema'
      } else if (hasCNPJ) {
        errorMessage = 'Este CNPJ já está cadastrado no sistema'
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 409 }
      )
    }

    // 2. Criar registro da clínica
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7) // 7 dias a partir de agora

    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinicas')
      .insert({
        nome: nomeClinica,
        cnpj: cnpjClinica,
        telefone: telefone,
        email: email,
        endereco: endereco,
        cidade: cidade,
        uf: uf,
        tipo_calendario: 'google',
        ia_ativa: true,
        prompt_ia: '',
        saldo_tokens: 600000 // 600k tokens para o plano trial
      })
      .select()
      .single()

    if (clinicError) {
      logger.error('Erro ao criar clínica:', clinicError)
      return NextResponse.json(
        { error: 'Erro ao cadastrar clínica' },
        { status: 500 }
      )
    }

    // 2.1 Buscar ID do plano trial
    const { data: planData, error: planError } = await supabaseAdmin
      .from('planos')
      .select('id')
      .eq('nome', 'trial') 
      .single()

    if (planError || !planData) {
      logger.error('Erro ao buscar plano trial:', planError)
    } else {
      // 2.2 Criar assinatura trial
      const { error: subError } = await supabaseAdmin
        .from('assinaturas')
        .insert({
          clinic_id: clinicData.id,
          plan_id: planData.id,
          status: 'ativa',
          data_inicio: new Date().toISOString(),
          data_fim: trialEndsAt.toISOString(),
          ciclo: 'mensal'
        })

      if (subError) {
        logger.error('Erro ao criar assinatura trial:', subError)
      }
    }

    // 3. Retornar sucesso para o frontend fazer o signup
    // O frontend fará o signup usando signUp() que envia o email de confirmação correto
    return NextResponse.json({
      success: true,
      message: 'Clínica cadastrada. Prosseguindo com registro de usuário...',
      clinicId: clinicData.id,
      requiresSignup: true
    })

  } catch (error: any) {
    logger.error('Erro no cadastro:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
