"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"

export default function ClinicLoginPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Fazer login com Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw new Error("Email ou senha incorretos")
      }

      if (!authData.user) {
        throw new Error("Erro ao fazer login")
      }

      // Verificar se o usuário tem um perfil e se é clinic_admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, clinic_id, is_active')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        throw new Error("Perfil não encontrado")
      }

      if (profile.role !== 'clinic_admin') {
        await supabase.auth.signOut()
        throw new Error("Acesso negado. Esta área é apenas para administradores de clínicas.")
      }

      if (!profile.is_active) {
        await supabase.auth.signOut()
        throw new Error("Conta inativa. Entre em contato com o suporte.")
      }

      if (!profile.clinic_id) {
        await supabase.auth.signOut()
        throw new Error("Clínica não vinculada. Entre em contato com o suporte.")
      }

      // Redirecionar para o dashboard da clínica
      router.push("/dashboard")
    } catch (error: any) {
      console.error('Erro ao fazer login:', error)
      setError(error.message || 'Erro ao fazer login. Tente novamente.')
    } finally {
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
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">Área da Clínica</CardTitle>
            <CardDescription>Entre com suas credenciais para acessar o dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span className="text-muted-foreground">Lembrar de mim</span>
                </label>
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Entre em contato
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
