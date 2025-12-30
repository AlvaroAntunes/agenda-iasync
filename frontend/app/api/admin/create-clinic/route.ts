import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { clinic, admin } = await request.json()

    // Validações
    if (!clinic || !admin) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      )
    }

    if (!admin.email || !admin.password || !admin.full_name) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios do administrador" },
        { status: 400 }
      )
    }

    if (admin.password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      )
    }

    // Verificar se é super admin
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Não precisamos implementar set para leitura
          },
          remove(name: string, options: CookieOptions) {
            // Não precisamos implementar remove para leitura
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      )
    }

    // Criar cliente com service role para operações administrativas
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 1. Criar a clínica
    const { data: newClinic, error: clinicError } = await supabaseAdmin
      .from('clinicas')
      .insert([clinic])
      .select()
      .single()

    if (clinicError) {
      console.error('Erro ao criar clínica:', clinicError)
      return NextResponse.json(
        { error: `Erro ao criar clínica: ${clinicError.message}` },
        { status: 500 }
      )
    }

    // 2. Criar usuário no auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
      user_metadata: {
        full_name: admin.full_name,
        role: 'clinic_admin',
        clinic_id: newClinic.id
      }
    })

    if (authError) {
      // Se falhar ao criar usuário, deletar a clínica
      await supabaseAdmin.from('clinicas').delete().eq('id', newClinic.id)
      console.error('Erro ao criar usuário:', authError)
      return NextResponse.json(
        { error: `Erro ao criar usuário: ${authError.message}` },
        { status: 500 }
      )
    }

    // 3. Atualizar o profile criado automaticamente pelo trigger
    // O trigger on_auth_user_created já criou o profile, apenas atualizamos os dados
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        clinic_id: newClinic.id,
        full_name: admin.full_name,
        role: 'clinic_admin',
        phone: admin.phone || null,
        is_active: true,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      // Se falhar, deletar usuário e clínica
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      await supabaseAdmin.from('clinicas').delete().eq('id', newClinic.id)
      console.error('Erro ao atualizar profile:', profileError)
      return NextResponse.json(
        { error: `Erro ao atualizar profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Clínica e administrador criados com sucesso",
        clinic: newClinic,
        admin: {
          id: authData.user.id,
          email: authData.user.email,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro ao criar clínica:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
