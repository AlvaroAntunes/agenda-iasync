"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, ArrowLeft, Eye, EyeOff, AlertCircle, Sparkles } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { logger } from '@/lib/logger'

export default function ClinicLoginPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetSuccess, setResetSuccess] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Verificar se há sessão ativa ao carregar
  useEffect(() => {
    const checkSession = async () => {
      // Verificar se era uma sessão temporária (não marcou "lembrar de mim")
      // sessionStorage é limpo quando o navegador fecha, então se não existir
      // e havia uma sessão, significa que o navegador foi fechado
      const wasTempSession = sessionStorage.getItem("clinic_temp_session")
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session && !wasTempSession) {
        // Havia uma sessão mas não tem o flag de sessão temporária
        // Isso significa que o navegador foi fechado e reaberto
        // Verificar se o usuário tinha marcado "lembrar de mim"
        const shouldRemember = localStorage.getItem("clinic_remember") === "true"
        
        if (!shouldRemember) {
          // Não marcou "lembrar de mim", fazer logout
          await supabase.auth.signOut()
          localStorage.removeItem("clinic-auth")
        } else {
          // Tinha marcado "lembrar de mim", manter sessão e redirecionar
          router.push("/dashboard")
        }
      } else if (session && wasTempSession) {
        // Sessão temporária ainda ativa (navegador não foi fechado)
        router.push("/dashboard")
      } else {
        // Não há sessão, apenas carregar email salvo se houver
        const savedEmail = localStorage.getItem("clinic_email")
        const shouldRemember = localStorage.getItem("clinic_remember") === "true"

        if (savedEmail && shouldRemember) {
          setEmail(savedEmail)
          setRememberMe(true)
        }
      }
    }

    checkSession()
  }, [supabase, router])

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

      // Gerenciar persistência da sessão
      if (!rememberMe) {
        // Se não marcou "lembrar de mim", remover a sessão do localStorage
        // A sessão ainda estará ativa no navegador atual, mas será perdida ao fechar
        localStorage.removeItem("clinic_email")
        localStorage.removeItem("clinic_remember")
        
        // Salvar um flag para fazer logout ao fechar o navegador
        sessionStorage.setItem("clinic_temp_session", "true")
      } else {
        // Salvar email para próximo acesso
        localStorage.setItem("clinic_email", email)
        localStorage.setItem("clinic_remember", "true")
        sessionStorage.removeItem("clinic_temp_session")
      }

      // Redirecionar para o dashboard da clínica
      router.push("/dashboard")
    } catch (error: any) {
      logger.error('Erro ao fazer login:', error)
      setError(error.message || 'Erro ao fazer login. Tente novamente.')
      
      // Limpar mensagem de erro após 3 segundos
      setTimeout(() => {
        setError("")
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsResetting(true)
    setError("")
    setResetSuccess(false)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        throw error
      }

      setResetSuccess(true)
      setTimeout(() => {
        setShowForgotPassword(false)
        setResetSuccess(false)
        setResetEmail("")
      }, 5000)
    } catch (error: any) {
      logger.error('Erro ao enviar email de recuperação:', error)
      setError('Erro ao enviar email de recuperação. Verifique se o email está correto.')
      
      // Limpar mensagem de erro após 3 segundos
      setTimeout(() => {
        setError("")
      }, 3000)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Background com gradiente suave */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-50 via-sky-50 to-cyan-50" />
      
      {/* Padrão de grid sutil */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(15 23 42) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Elementos decorativos */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500 rounded-full blur-[120px] opacity-10"
      />
      <motion.div
        animate={{ 
          scale: [1.1, 1, 1.1],
          opacity: [0.08, 0.12, 0.08]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-400 rounded-full blur-[100px] opacity-10"
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Botão Voltar */}
        {!showForgotPassword && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <Link href="/">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-cyan-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Card de Login */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-100/60 p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center justify-center mb-6"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 shadow-lg shadow-cyan-500/30">
                <Building2 className="h-8 w-8 text-white" strokeWidth={1.5} />
              </div>
            </motion.div>

            <h1 className="text-3xl font-bold text-cyan-950 tracking-tight mb-2">
              {showForgotPassword ? "Recuperar Senha" : "Área da Clínica"}
            </h1>
            <p className="text-cyan-900/70 mb-8 lg:mb-4">
              {showForgotPassword 
                ? "Digite seu email para receber o link de recuperação" 
                : "Entre com suas credenciais para acessar o dashboard"}
            </p>

            {showForgotPassword && (
              <p className="text-xs text-cyan-700 mt-2 bg-cyan-50 px-3 py-2 rounded-lg border border-cyan-100">
                💡 <strong>Dica:</strong> Verifique também a caixa de spam ou lixo eletrônico
              </p>
            )}
          </div>

          {/* Form de Login */}
          {!showForgotPassword ? (
            <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-cyan-900 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-cyan-900 font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 pr-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-cyan-600 hover:text-cyan-700"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500"
                  disabled={isLoading}
                />
                <span className="text-cyan-900/70">Lembrar de mim</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-cyan-700 hover:text-cyan-800 font-medium hover:underline cursor-pointer"
                disabled={isLoading}
              >
                Esqueci minha senha
              </button>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-all duration-300" 
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          ) : (
            /* Form de Recuperação de Senha */
            <form onSubmit={handleForgotPassword} className="space-y-5">
              {resetSuccess ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert className="border-green-200 bg-green-50">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Email enviado! Verifique sua caixa de entrada para redefinir sua senha.
                    </AlertDescription>
                  </Alert>
                </motion.div>
              ) : error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-cyan-900 font-medium">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={isResetting || resetSuccess}
                  className="h-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
                />
              </div>
              
              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-all duration-300" 
                  disabled={isResetting || resetSuccess}
                >
                  {isResetting ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
                
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetEmail("")
                    setError("")
                    setResetSuccess(false)
                  }}
                  className="w-full h-12 text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50"
                  disabled={isResetting}
                >
                  Voltar para o login
                </Button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Footer */}
        {!showForgotPassword && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 text-center"
          >
            <p className="text-sm text-cyan-900/70">
              Não tem uma conta?{" "}
              <Link href="/cadastro" className="text-cyan-700 hover:text-cyan-800 font-semibold hover:underline">
                Cadastre-se
              </Link>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
