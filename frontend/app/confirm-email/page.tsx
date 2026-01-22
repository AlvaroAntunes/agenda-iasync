"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, AlertCircle, CheckCircle2, Mail } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { logger } from '@/lib/logger'

export default function ConfirmEmailPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [isValidating, setIsValidating] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Aguardar um pouco para garantir que a URL foi carregada
        await new Promise(resolve => setTimeout(resolve, 100))

        // Verificar tanto hash (#) quanto query params (?)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const queryParams = new URLSearchParams(window.location.search)
        
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
        const type = hashParams.get('type') || queryParams.get('type')

        if (!accessToken || type !== 'signup') {
          // Verificar se há uma sessão ativa
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session && session.user.email_confirmed_at) {
            // Email já confirmado
            setSuccess(true)
            setIsValidating(false)
            setTimeout(() => {
              router.push("/login")
            }, 5000)
            return
          }
          
          setError("Link de confirmação inválido ou expirado.")
        } else {
          // Token válido, email confirmado com sucesso
          setSuccess(true)
          setTimeout(() => {
            router.push("/login")
          }, 3000)
        }
      } catch (err) {
        logger.error('❌ Erro ao confirmar email:', err)
        setError("Erro ao confirmar o email")
      } finally {
        setIsValidating(false)
      }
    }

    confirmEmail()
  }, [router, supabase])

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
        {/* Card de Confirmação */}
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
                {success ? (
                  <CheckCircle2 className="h-8 w-8 text-white" strokeWidth={1.5} />
                ) : error ? (
                  <AlertCircle className="h-8 w-8 text-white" strokeWidth={1.5} />
                ) : (
                  <Mail className="h-8 w-8 text-white" strokeWidth={1.5} />
                )}
              </div>
            </motion.div>

            <h1 className="text-3xl font-bold text-cyan-950 tracking-tight mb-2">
              {success ? "Email Confirmado!" : error ? "Erro na Confirmação" : "Confirmando Email..."}
            </h1>
            <p className="text-cyan-900/70">
              {success 
                ? "Sua conta foi ativada com sucesso" 
                : error 
                  ? "Não foi possível confirmar seu email"
                  : "Aguarde enquanto validamos seu email"}
            </p>
          </div>

          {/* Conteúdo */}
          <div className="space-y-5">
            {isValidating ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Validando seu email...
                  </AlertDescription>
                </Alert>
              </motion.div>
            ) : success ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="space-y-2">
                      <p className="font-semibold">Email confirmado com sucesso!</p>
                      <p className="text-sm">Você já pode fazer login na sua conta.</p>
                      <p className="text-xs mt-2">Redirecionando para a página de login...</p>
                    </div>
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
                  <AlertDescription className="text-red-800">
                    <div className="space-y-2">
                      <p className="font-semibold">{error}</p>
                      <p className="text-sm">O link pode ter expirado ou já foi utilizado.</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {!isValidating && (
              <div className="text-center">
                <Link href="/login">
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-all duration-300"
                  >
                    {success ? "Ir para o Login" : "Voltar para o Login"}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
