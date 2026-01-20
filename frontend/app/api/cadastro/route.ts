import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
      console.error('Erro ao verificar duplicatas:', checkError)
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
        plano: 'trial',
        tipo_calendario: 'google',
        ia_ativa: true,
        prompt_ia: '',
        trial_ends_at: trialEndsAt.toISOString(),
        status_assinatura: 'ativa',
      })
      .select()
      .single()

    if (clinicError) {
      console.error('Erro ao criar clínica:', clinicError)
      return NextResponse.json(
        { error: 'Erro ao cadastrar clínica' },
        { status: 500 }
      )
    }

    // 3. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        full_name: nomeClinica,
      }
    })

    if (authError) {
      console.error('Erro ao criar usuário:', authError)
      // Rollback: deletar clínica
      await supabaseAdmin.from('clinicas').delete().eq('id', clinicData.id)
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      )
    }

    if (!authData.user) {
      // Rollback: deletar clínica
      await supabaseAdmin.from('clinicas').delete().eq('id', clinicData.id)
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      )
    }

    // 4. Atualizar perfil do usuário (assumindo que existe trigger on_auth_user_created)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'clinic_admin',
        clinic_id: clinicData.id,
        is_active: true,
        full_name: nomeClinica,
        phone: telefone,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Erro ao atualizar perfil:', profileError)
      // Rollback: deletar usuário e clínica
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      await supabaseAdmin.from('clinicas').delete().eq('id', clinicData.id)
      return NextResponse.json(
        { error: 'Erro ao configurar perfil' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cadastro realizado com sucesso',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      }
    })

  } catch (error: any) {
    console.error('Erro no cadastro:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
