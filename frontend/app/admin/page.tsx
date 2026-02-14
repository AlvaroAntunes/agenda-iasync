"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { logger } from "@/lib/logger"

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      logger.log('🔐 Tentando login com:', email)
      
      // Login com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        logger.error('❌ Erro de autenticação:', authError)
        setError(`Email ou senha inválidos: ${authError.message}`)
        setIsLoading(false)
        return
      }

      logger.log('✅ Autenticado com sucesso. User ID:', authData.user.id)

      // Verificar se é super_admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, clinic_id')
        .eq('id', authData.user.id)
        .single()

      logger.log('📋 Profile encontrado:', profile)
      logger.log('❌ Erro no profile:', profileError)

      if (profileError || !profile) {
        logger.error('❌ Erro ao carregar perfil:', profileError)
        setError(`Erro ao carregar perfil do usuário: ${profileError?.message || 'Profile não encontrado'}`)
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      if (profile.role !== 'super_admin') {
        logger.warn('⚠️ Usuário não é super_admin. Role:', profile.role)
        setError("Acesso negado. Apenas super administradores podem acessar esta área.")
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      logger.log('🎉 Super admin verificado! Redirecionando...')
      // Sucesso - redirecionar para admin
      router.push("/admin/dashboard")
    } catch (err) {
      logger.error("💥 Erro no login:", err)
      setError(`Erro ao fazer login: ${err instanceof Error ? err.message : 'Tente novamente.'}`)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Painel Administrativo</CardTitle>
            <CardDescription>Acesso restrito a super administradores</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@iasync.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Acesso para clínicas?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Clique aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
