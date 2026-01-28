"use client"

import { useState, useEffect, Suspense } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { logger } from '@/lib/logger'

function ConfirmacaoContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const supabase = getSupabaseBrowserClient()

    const email = searchParams.get("email")
    const [timeLeft, setTimeLeft] = useState(60)
    const [isResending, setIsResending] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!email) {
            router.push("/cadastro")
        }
    }, [email, router])

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [timeLeft])

    const handleResendEmail = async () => {
        if (!email) return

        setIsResending(true)
        setError("")
        setResendSuccess(false)

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/confirm-email`
                }
            })

            if (error) throw error

            setResendSuccess(true)
            setTimeLeft(60) // Reinicia o timer

            // Limpa mensagem de sucesso após 5s
            setTimeout(() => setResendSuccess(false), 5000)

        } catch (err: any) {
            logger.error("Erro ao reenviar email:", err)
            setError(err.message || "Erro ao reenviar email. Tente novamente.")
        } finally {
            setIsResending(false)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    if (!email) return null

    return (
        <div className="relative z-10 w-full max-w-md">
            {/* Botão Voltar */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
            >
                <Link href="/login">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-cyan-600"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para Login
                    </Button>
                </Link>
            </motion.div>

            {/* Card */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-100/60 p-8"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex items-center justify-center mb-6"
                    >
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 shadow-lg shadow-cyan-500/30">
                            <Mail className="h-8 w-8 text-white" strokeWidth={1.5} />
                        </div>
                    </motion.div>

                    <h1 className="text-2xl font-bold text-cyan-950 tracking-tight mb-2">
                        Verifique seu email
                    </h1>
                    <p className="text-cyan-900/70">
                        Enviamos um link de confirmação para:<br />
                        <span className="font-semibold text-cyan-900">{email}</span>
                    </p>
                </div>

                <div className="space-y-6">
                    <Alert className="border-blue-200 bg-blue-50">
                        <AlertDescription className="text-blue-800 text-sm text-center">
                            Clique no link enviado para ativar sua conta e acessar a plataforma.
                        </AlertDescription>
                    </Alert>

                    {resendSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Alert className="border-green-200 bg-green-50">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    Email reenviado com sucesso!
                                </AlertDescription>
                            </Alert>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Alert variant="destructive" className="border-red-200 bg-red-50">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-red-800">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        </motion.div>
                    )}

                    <div className="space-y-4">
                        <Button
                            variant="outline"
                            className="w-full h-12 border-cyan-200 text-cyan-700 hover:text-cyan-500 font-medium"
                            onClick={handleResendEmail}
                            disabled={timeLeft > 0 || isResending}
                        >
                            {isResending ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : timeLeft > 0 ? (
                                `Reenviar email em ${formatTime(timeLeft)}`
                            ) : (
                                "Reenviar email"
                            )}
                        </Button>

                        <Link href="/login" className="block">
                            <Button
                                className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-all duration-300"
                            >
                                Já confirmei meu email
                            </Button>
                        </Link>
                    </div>

                    <p className="text-xs text-center text-cyan-900/50 mt-4">
                        Não recebeu? Verifique sua caixa de spam ou lixo eletrônico.
                    </p>
                </div>
            </motion.div>
        </div>
    )
}

export default function ConfirmacaoPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
            {/* Background com gradiente suave (mesmo do cadastro) */}
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

            <Suspense fallback={<div>Carregando...</div>}>
                <ConfirmacaoContent />
            </Suspense>
        </div>
    )
}
