"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  QrCode, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ArrowLeft,
  CreditCard,
  FileText
} from "lucide-react"
import Link from "next/link"

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [checkingPayment, setCheckingPayment] = useState(false)

  useEffect(() => {
    loadPaymentData()
    // Verificar status a cada 10 segundos
    const interval = setInterval(checkPaymentStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadPaymentData = async () => {
    try {
      const paymentId = searchParams.get('paymentId')
      
      if (!paymentId) {
        throw new Error('ID de pagamento não encontrado')
      }

      // Buscar dados do pagamento
      const { data, error } = await supabase
        .from('pagamentos')
        .select('*, clinicas(nome)')
        .eq('id_gateway_pagamento', paymentId)
        .single()

      if (error) throw error

      // Buscar detalhes do Asaas via API
      const response = await fetch(`/api/payment-status?paymentId=${paymentId}`)
      const asaasData = await response.json()

      setPaymentData({ ...data, ...asaasData })
    } catch (error: any) {
      console.error('Erro ao carregar pagamento:', error)
      setError(error.message || 'Erro ao carregar dados do pagamento')
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async () => {
    if (checkingPayment) return
    
    setCheckingPayment(true)
    try {
      const paymentId = searchParams.get('paymentId')
      const response = await fetch(`/api/payment-status?paymentId=${paymentId}`)
      const data = await response.json()

      if (data.status === 'RECEIVED' || data.status === 'CONFIRMED') {
        // Pagamento confirmado, redirecionar
        router.push('/dashboard?payment=success')
      }

      setPaymentData((prev: any) => ({ ...prev, ...data }))
    } catch (error) {
      console.error('Erro ao verificar status:', error)
    } finally {
      setCheckingPayment(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Erro ao copiar:', error)
    }
  }

  const downloadBoleto = () => {
    if (paymentData?.bankSlipUrl) {
      window.open(paymentData.bankSlipUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando pagamento...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-center">Erro</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/upgrade">
              <Button className="w-full">Voltar para Planos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPix = paymentData?.metodo_pagamento === 'PIX'
  const isBoleto = paymentData?.metodo_pagamento === 'BOLETO'

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-cyan-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Link href="/upgrade">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Finalizar Pagamento</h1>
        </div>
      </header>

      <main className="container px-4 py-12 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Status Card */}
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Aguardando pagamento</strong>
              <p className="text-sm mt-1">
                Estamos verificando seu pagamento automaticamente. Você será notificado assim que for confirmado.
              </p>
            </AlertDescription>
          </Alert>

          {/* Payment Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano</span>
                <span className="font-semibold capitalize">{paymentData?.plano}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ciclo</span>
                <span className="font-semibold capitalize">{paymentData?.ciclo_cobranca}</span>
              </div>
              <div className="flex justify-between border-t pt-4">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-cyan-600">
                  R$ {paymentData?.valor?.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* PIX QR Code */}
          {isPix && paymentData?.pixQrCode && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  <CardTitle>Pagar com PIX</CardTitle>
                </div>
                <CardDescription>
                  Escaneie o QR Code ou copie o código PIX
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* QR Code Image */}
                <div className="flex justify-center p-6 bg-white rounded-lg border">
                  <img 
                    src={`data:image/png;base64,${paymentData.pixQrCode.encodedImage}`}
                    alt="QR Code PIX"
                    className="w-64 h-64"
                  />
                </div>

                {/* PIX Code */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Código PIX (Copia e Cola)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={paymentData.pixQrCode.payload}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border rounded-md bg-gray-50 font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(paymentData.pixQrCode.payload)}
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {copied && (
                    <p className="text-sm text-green-600 mt-2">✓ Código copiado!</p>
                  )}
                </div>

                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 text-sm">
                  <p className="font-medium text-cyan-900 mb-2">Como pagar:</p>
                  <ol className="list-decimal list-inside space-y-1 text-cyan-800">
                    <li>Abra o app do seu banco</li>
                    <li>Escolha pagar via PIX</li>
                    <li>Escaneie o QR Code ou cole o código</li>
                    <li>Confirme o pagamento</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Boleto */}
          {isBoleto && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle>Boleto Bancário</CardTitle>
                </div>
                <CardDescription>
                  Vencimento: {new Date(paymentData.dueDate).toLocaleDateString('pt-BR')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={downloadBoleto}
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Baixar Boleto
                </Button>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                  <p className="font-medium text-amber-900 mb-2">⚠️ Atenção:</p>
                  <p className="text-amber-800">
                    O boleto pode levar até 3 dias úteis para ser compensado após o pagamento.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checking Status */}
          {checkingPayment && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando status do pagamento...
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
