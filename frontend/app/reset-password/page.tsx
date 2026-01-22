"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, Eye, EyeOff, AlertCircle, CheckCircle2, Check, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isValidatingToken, setIsValidatingToken] = useState(true)

  // Validações de senha em tempo real
  const passwordValidation = {
    minLength: newPassword.length >= 8,
    hasLowerCase: /[a-z]/.test(newPassword),
    hasUpperCase: /[A-Z]/.test(newPassword),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
  }

  const isPasswordValid = Object.values(passwordValidation).every(Boolean)

  useEffect(() => {
    const validateToken = async () => {
      try {
        // Aguardar um pouco para garantir que a URL foi carregada
        await new Promise(resolve => setTimeout(resolve, 100))

        // Verificar tanto hash (#) quanto query params (?)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const queryParams = new URLSearchParams(window.location.search)
        
        let accessToken = hashParams.get('access_token') || queryParams.get('access_token')
        let type = hashParams.get('type') || queryParams.get('type')

        // Se não encontrou, verificar a sessão do Supabase
        if (!accessToken || type !== 'recovery') {
          const { data: { session } } = await supabase.auth.getSession()
          console.log('🔍 Debug - Session:', session)
          
          if (session) {
            // Tem sessão ativa, pode redefinir senha
            console.log('✅ Sessão válida encontrada')
            setIsValidatingToken(false)
            return
          }
          
          setError("Link de recuperação inválido ou expirado. Por favor, solicite um novo link.")
        }
      } catch (err) {
        console.error('❌ Erro ao validar token:', err)
        setError("Erro ao validar o link de recuperação")
      } finally {
        setIsValidatingToken(false)
      }
    }

    validateToken()
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validações
    if (!isPasswordValid) {
      setError("A senha não atende aos requisitos mínimos")
      setTimeout(() => setError(""), 3000)
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem")
      setTimeout(() => setError(""), 3000)
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw error
      }

      setSuccess(true)
      
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error)
      
      // Traduzir mensagens de erro comuns
      let errorMessage = error.message || 'Erro ao redefinir senha. Tente novamente.'
      
      if (errorMessage.includes('New password should be different from the old password')) {
        errorMessage = 'A nova senha deve ser diferente da senha antiga.'
      } else if (errorMessage.includes('Password should be at least')) {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.'
      } else if (errorMessage.includes('Unable to validate email address')) {
        errorMessage = 'Não foi possível validar o endereço de email.'
      } else if (errorMessage.includes('Token has expired or is invalid')) {
        errorMessage = 'Link de recuperação expirado ou inválido. Solicite um novo.'
      }
      
      setError(errorMessage)
      setTimeout(() => setError(""), 5000)
    } finally {
      setIsLoading(false)
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
        {/* Card de Redefinição de Senha */}
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
              Redefinir Senha
            </h1>
            <p className="text-cyan-900/70">
              Digite sua nova senha
            </p>
          </div>

          {/* Form */}
          {isValidatingToken ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Validando link de recuperação...
                </AlertDescription>
              </Alert>
            </motion.div>
          ) : error && error.includes('Link de recuperação inválido ou expirado') ? (
            <div className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              </motion.div>
              
              <div className="text-center">
                <Link href="/login">
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-all duration-300"
                  >
                    Voltar para o login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Senha redefinida com sucesso! Redirecionando para o login...
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
              <Label htmlFor="newPassword" className="text-cyan-900 font-medium">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading || success}
                  className="h-12 pr-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-cyan-600 hover:text-cyan-700"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || success}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {newPassword && (
                <div className="space-y-2 mt-3 p-3 bg-cyan-50/50 rounded-lg border border-cyan-100">
                  <p className="text-xs font-medium text-cyan-900 mb-2">Requisitos da senha:</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      {passwordValidation.minLength ? (
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordValidation.minLength ? "text-green-700" : "text-red-600"}>
                        Mínimo 8 caracteres
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {passwordValidation.hasLowerCase ? (
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordValidation.hasLowerCase ? "text-green-700" : "text-red-600"}>
                        Pelo menos uma letra minúscula
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {passwordValidation.hasUpperCase ? (
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordValidation.hasUpperCase ? "text-green-700" : "text-red-600"}>
                        Pelo menos uma letra MAIÚSCULA
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {passwordValidation.hasSpecialChar ? (
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordValidation.hasSpecialChar ? "text-green-700" : "text-red-600"}>
                        Pelo menos um caractere especial (!@#$%...)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-cyan-900 font-medium">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading || success}
                  className="h-12 pr-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-cyan-600 hover:text-cyan-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading || success}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {confirmPassword && (
                <div className="flex items-center gap-2 text-xs mt-1">
                  {newPassword === confirmPassword ? (
                    <>
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-green-700">As senhas coincidem</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="text-red-600">As senhas devem ser iguais</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={isLoading || success || isValidatingToken || !isPasswordValid || newPassword !== confirmPassword}
            >
              {isLoading ? "Redefinindo..." : success ? "Senha redefinida!" : "Redefinir senha"}
            </Button>

              {!success && (
                <div className="text-center">
                  <Link href="/login" className="text-sm text-cyan-700 hover:text-cyan-800 font-medium hover:underline">
                    Voltar para o login
                  </Link>
                </div>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
}
