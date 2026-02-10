"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TrialBanner } from "@/components/TrialBanner"
import {
  Calendar,
  Clock,
  User,
  Phone,
  Bot,
  ChevronRight,
  CheckCircle2,
  QrCode,
  RefreshCw,
  Trash2,
  Link2
} from "lucide-react"
import { ClinicLoading } from "@/components/ClinicLoading"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { useSubscriptionCheck } from "@/lib/use-subscription-check"
import { logger } from '@/lib/logger'
import { toast } from "sonner"
import { ClinicHeader } from "@/components/Header"
import { ClinicData, useClinic } from "@/app/contexts/ClinicContext"

type Appointment = {
  id: string
  horario_consulta: string
  status: string
  origem_agendamento: string
  paciente: {
    nome: string
    telefone: string
  } | null
  profissional: {
    nome: string
    especialidade: string
  } | null
}

export default function ClinicDashboard() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  useSubscriptionCheck() // Verificar status da assinatura automaticamente

  const { clinicData, setClinicData } = useClinic()

  // Token Purchase State
  const [buyTokensOpen, setBuyTokensOpen] = useState(false)
  const [tokenAmount, setTokenAmount] = useState(1) // Em milhões
  const [buyingTokens, setBuyingTokens] = useState(false)
  const [isWaitingTokenPayment, setIsWaitingTokenPayment] = useState(false)

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState("")
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [uazapiStatus, setUazapiStatus] = useState("not_configured")
  const [uazapiQrCode, setUazapiQrCode] = useState<string | null>(null)
  const [uazapiPairingCode, setUazapiPairingCode] = useState<string | null>(null)
  const [uazapiLoading, setUazapiLoading] = useState(false)
  const [newConversationsCount, setNewConversationsCount] = useState(0)
  const [newConversationsLoading, setNewConversationsLoading] = useState(false)
  const [weeklyConversations, setWeeklyConversations] = useState<{ label: string; count: number }[]>([])
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; count: number; x: number; y: number } | null>(null)
  const hasInstanceToken = Boolean(clinicData?.uazapi_token)

  useEffect(() => {
    checkAuthAndLoadClinic()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime subscription for Clinic Updates (Balance/Status)
  useEffect(() => {
    if (!clinicData?.id) return

    const channel = supabase
      .channel(`clinic-updates-${clinicData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clinicas',
          filter: `id=eq.${clinicData.id}`
        },
        (payload: any) => {
          const updated = payload.new
          if (updated) {
            setClinicData((prev: ClinicData | null) => {
              if (!prev) return null

              // Show toast only if balance increased
              if (updated.saldo_tokens > prev.saldo_tokens) {
                toast.success("Saldo de tokens atualizado!")
                setIsWaitingTokenPayment(false)
                setBuyTokensOpen(false)
              }

              return {
                ...prev,
                saldo_tokens: updated.saldo_tokens,
                tokens_comprados: updated.tokens_comprados,
                ia_ativa: updated.ia_ativa,
              }
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clinicData?.id])

  const handleBuyTokens = async () => {
    if (!clinicData?.id) return

    setBuyingTokens(true)
    try {
      const amount_tokens = tokenAmount * 1000000

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/checkout/tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinic_id: clinicData.id,
          amount_tokens: amount_tokens
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Erro ao processar compra")
      }

      const data = await response.json()
      if (data.url) {
        window.open(data.url, '_blank')
        // setBuyTokensOpen(false) // Keep it open or close? Better to close and show waiting modal
        setBuyTokensOpen(false)
        setIsWaitingTokenPayment(true)
      }
    } catch (error: any) {
      console.error("Erro na compra de tokens:", error)
      alert(error.message || "Erro ao iniciar compra de tokens")
    } finally {
      setBuyingTokens(false)
    }
  }

  const checkAuthAndLoadClinic = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login/clinic')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id, role')
        .eq('id', user.id)
        .single()

      if (!profile || !profile.clinic_id || profile.role !== 'clinic_admin') {
        router.push('/login/clinic')
        return
      }

      // Carregar dados da clínica
      const { data: clinic, error: clinicError } = await supabase
        .from('clinicas')
        .select(`
          *,
          *,
          tokens_comprados,
          assinaturas (
            planos (
              max_tokens
            )
          )
        `)
        .eq('id', profile.clinic_id)
        .single()

      if (clinicError) throw clinicError

      if (clinicError) throw clinicError

      setClinicData(clinic)

      await loadNewConversations(profile.clinic_id)

      // Carregar consultas da clínica
      await loadAppointments(profile.clinic_id)
    } catch (error) {
      logger.error('Erro ao carregar dados:', error)
      router.push('/login/clinic')
    } finally {
      setLoading(false)
    }
  }

  const loadAppointments = async (clinicId: string) => {
    try {
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('consultas')
        .select(`
          id,
          horario_consulta,
          status,
          origem_agendamento,
          paciente:leads!paciente_id (
            nome,
            telefone
          ),
          profissional:profissionais!profissional_id (
            nome,
            especialidade
          )
        `)
        .eq('clinic_id', clinicId)
        .order('horario_consulta', { ascending: true })

      if (appointmentsError) throw appointmentsError

      const appointments = (appointmentsData || []) as Appointment[]
      setAppointments(appointments)

      // Filtrar consultas de hoje
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayAppts = appointments.filter((apt: Appointment) => {
        const aptDate = new Date(apt.horario_consulta)
        return aptDate >= today && aptDate < tomorrow
      })
      setTodayAppointments(todayAppts)

      // Filtrar consultas futuras (a partir de amanhã)
      const upcomingAppts = appointments.filter((apt: Appointment) => {
        const aptDate = new Date(apt.horario_consulta)
        return aptDate >= tomorrow
      })
      setUpcomingAppointments(upcomingAppts)
    } catch (error) {
      logger.error('Erro ao carregar consultas:', error)
    }
  }

  const loadNewConversations = async (clinicId: string) => {
    try {
      setNewConversationsLoading(true)
      const formatKey = (date: Date) => {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, "0")
        const d = String(date.getDate()).padStart(2, "0")
        return `${y}-${m}-${d}`
      }
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const startOfWeek = new Date(startOfToday)
      startOfWeek.setDate(startOfWeek.getDate() - 6)
      const startIso = startOfWeek.toISOString()

      const { data, error } = await supabase
        .from("chat_messages")
        .select("session_id, created_at")
        .eq("clinic_id", clinicId)
        .gte("created_at", startIso)
        .order("created_at", { ascending: false })
        .limit(5000)

      if (error) throw error

      const buckets = new Map<string, Set<string>>()
      for (let i = 0; i < 7; i += 1) {
        const day = new Date(startOfWeek)
        day.setDate(startOfWeek.getDate() + i)
        buckets.set(formatKey(day), new Set())
      }

      for (const row of data || []) {
        if (!row?.session_id || !row?.created_at) continue
        const key = formatKey(new Date(row.created_at))
        const bucket = buckets.get(key)
        if (bucket) bucket.add(row.session_id)
      }

      const series: { label: string; count: number }[] = []
      for (let i = 0; i < 7; i += 1) {
        const day = new Date(startOfWeek)
        day.setDate(startOfWeek.getDate() + i)
        const key = formatKey(day)
        const label = day.toLocaleDateString("pt-BR", { weekday: "short" })
        series.push({ label, count: buckets.get(key)?.size || 0 })
      }

      setWeeklyConversations(series)
      setNewConversationsCount(series[6]?.count ?? 0)
    } catch (err) {
      logger.error("Erro ao carregar novas conversas:", err)
      setNewConversationsCount(0)
      setWeeklyConversations([])
    } finally {
      setNewConversationsLoading(false)
    }
  }

  const handleToggleIA = async () => {
    if (!clinicData) return

    try {
      const newIAStatus = !clinicData.ia_ativa

      const { error: updateError } = await supabase
        .from('clinicas')
        .update({ ia_ativa: newIAStatus })
        .eq('id', clinicData.id)

      if (updateError) throw updateError

      setClinicData({ ...clinicData, ia_ativa: newIAStatus })
      setSuccess(newIAStatus ? "IA ativada com sucesso!" : "IA desativada com sucesso!")

      setTimeout(() => {
        setSuccess("")
      }, 3000)
    } catch (error: any) {
      logger.error('Erro ao atualizar status da IA:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setClinicData(null)
  }

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND ||
    ""

  const apiUrl = (path: string) => (apiBaseUrl ? `${apiBaseUrl}${path}` : path)

  const normalizeQrCode = (value?: string | null) => {
    if (!value) return null
    if (value.startsWith("data:")) return value
    return `data:image/png;base64,${value}`
  }

  const resolveUazapiStatus = (data: any) => {
    if (data?.status?.connected === true || data?.status?.loggedIn === true) {
      return "connected"
    }
    return (
      data?.status ||
      data?.instance?.status ||
      data?.instance?.state ||
      data?.state ||
      "unknown"
    )
  }

  const resolveUazapiQr = (data: any) => {
    return (
      data?.qrcode ||
      data?.instance?.qrcode ||
      data?.qr ||
      data?.instance?.qr ||
      data?.qrCode ||
      data?.instance?.qrCode ||
      data?.code ||
      data?.instance?.code ||
      data?.data?.qrcode ||
      null
    )
  }

  const resolveUazapiPairingCode = (data: any) => {
    return (
      data?.pairingCode ||
      data?.pairing_code ||
      data?.instance?.paircode ||
      data?.code ||
      null
    )
  }

  const fetchUazapiStatus = async (clinicId: string) => {
    try {
      const response = await fetch(apiUrl(`/uazapi/instance/status/${clinicId}`))
      const raw = await response.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!response.ok) {
        throw new Error((data as any)?.detail || raw || "Erro ao consultar status")
      }
      let status = resolveUazapiStatus(data)
      if (status === "not_configured" && hasInstanceToken) {
        status = "disconnected"
      }
      setUazapiStatus(status)
      setUazapiQrCode(normalizeQrCode(resolveUazapiQr(data)))
      setUazapiPairingCode(resolveUazapiPairingCode(data))
    } catch (err) {
      logger.error("Erro ao buscar status Uazapi:", err)
      setUazapiStatus("error")
    }
  }

  const handleCreateUazapiInstance = async () => {
    if (!clinicData?.id) return
    if (hasInstanceToken) {
      toast.info("Você já possui uma instância ativa.")
      return
    }
    if (uazapiStatus !== "not_configured" && uazapiStatus !== "error") {
      toast.info("Você já possui uma instância ativa.")
      return
    }
    setUazapiLoading(true)
    setUazapiStatus("connecting")
    try {
      const response = await fetch(apiUrl(`/uazapi/instance/create/${clinicData.id}`), {
        method: "POST",
      })
      const raw = await response.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!response.ok) {
        throw new Error((data as any)?.detail || raw || "Erro ao criar instância")
      }
      toast.success("Instância criada")
      await fetchUazapiStatus(clinicData.id)
    } catch (err: any) {
      setUazapiStatus("error")
      toast.error(err?.message || "Erro ao criar instância")
    } finally {
      setUazapiLoading(false)
    }
  }

  const handleConnectUazapi = async () => {
    if (!clinicData?.id) return
    if (uazapiStatus === "not_configured") {
      toast.info("Crie a instância antes de gerar o QR Code.")
      return
    }
    setUazapiLoading(true)
    try {
      const response = await fetch(apiUrl(`/uazapi/instance/connect/${clinicData.id}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })
      const raw = await response.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!response.ok) {
        throw new Error((data as any)?.detail || raw || "Erro ao gerar QR code")
      }
      setUazapiStatus(resolveUazapiStatus(data))
      setUazapiQrCode(normalizeQrCode(resolveUazapiQr(data)))
      setUazapiPairingCode(resolveUazapiPairingCode(data))
      toast.success("QR Code gerado")
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar QR code")
    } finally {
      setUazapiLoading(false)
    }
  }

  const handleRefreshUazapiStatus = async () => {
    if (!clinicData?.id) return
    setUazapiLoading(true)
    try {
      await fetchUazapiStatus(clinicData.id)
    } finally {
      setUazapiLoading(false)
    }
  }

  const handleDeleteUazapiInstance = async () => {
    if (!clinicData?.id) return
    if (uazapiStatus === "not_configured") {
      toast.info("Nenhuma instância para excluir.")
      return
    }
    setUazapiLoading(true)
    try {
      const response = await fetch(apiUrl(`/uazapi/instance/${clinicData.id}`), {
        method: "DELETE",
      })
      const raw = await response.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!response.ok) {
        throw new Error((data as any)?.detail || raw || "Erro ao excluir instância")
      }
      setUazapiStatus("not_configured")
      setUazapiQrCode(null)
      setUazapiPairingCode(null)
      toast.success("Instância excluída")
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir instância")
    } finally {
      setUazapiLoading(false)
    }
  }

  useEffect(() => {
    if (!clinicData?.id) return
    fetchUazapiStatus(clinicData.id)
    const interval = setInterval(() => fetchUazapiStatus(clinicData.id), 12000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicData?.id])

  if (loading) {
    return <ClinicLoading />
  }

  const confirmedCount = todayAppointments.filter((a) => a.status === "confirmed").length
  const pendingCount = todayAppointments.filter((a) => a.status === "pending").length
  const maxWeekly = weeklyConversations.reduce((max, item) => Math.max(max, item.count), 1)
  const weeklyTotal = weeklyConversations.reduce((sum, item) => sum + item.count, 0)
  const weeklyAvg = weeklyConversations.length ? Math.round(weeklyTotal / weeklyConversations.length) : 0
  const bestDay = weeklyConversations.reduce(
    (best, item) => (item.count > best.count ? item : best),
    { label: "-", count: 0 }
  )
  const chartHeight = 40
  const chartPadding = 4
  const chartMaxY = chartHeight - chartPadding
  const chartMinY = chartPadding
  const chartRange = chartMaxY - chartMinY
  const chartPoints = weeklyConversations
    .map((item, index) => {
      const x = weeklyConversations.length <= 1 ? 50 : (index / (weeklyConversations.length - 1)) * 100
      const y = chartMaxY - (item.count / maxWeekly) * chartRange
      return `${x},${y}`
    })
    .join(" ")

  const getStatusBadge = (status: string) => {
    if (status === "confirmed") {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Confirmado</Badge>
    }
    if (status === "pending") {
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pendente</Badge>
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  const totalTokens = clinicData?.assinaturas?.[0]?.planos?.max_tokens || 1000000
  const saldoTokens = clinicData?.saldo_tokens || 0
  const tokensComprados = clinicData?.tokens_comprados || 0

  // Lógica de visualização
  const usingPurchasedTokens = saldoTokens <= 0 && tokensComprados > 0
  const outOfTokens = saldoTokens <= 0 && tokensComprados <= 0

  // Se estiver usando tokens comprados, não tem "porcentagem" do plano, é valor absoluto
  // Se estiver usando plano, calcula porcentagem
  const usedPlanTokens = Math.max(0, totalTokens - saldoTokens)
  const tokenPercentage = (usedPlanTokens / totalTokens) * 100

  // Modal de Espera de Pagamento (Token)
  if (isWaitingTokenPayment) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-violet-100 via-white to-violet-200 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md mx-4 border border-violet-100 relative">
          <div className="flex flex-col items-center mb-4">
            <div className="animate-spin w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full mb-2 shadow-lg"></div>
            <span className="absolute top-6 right-6 text-violet-400 animate-pulse">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 2v2m0 16v2m8-10h2M2 12H4m15.07 7.07l1.41 1.41M4.93 4.93L3.52 3.52m15.07-1.41l-1.41 1.41M4.93 19.07l-1.41 1.41" /></svg>
            </span>
          </div>
          <h3 className="text-2xl font-extrabold text-violet-700 mb-2 tracking-tight">Aguardando Pagamento...</h3>
          <p className="text-gray-600 mb-6 text-base">
            A guia de pagamento foi aberta em uma nova aba.<br />
            Assim que o pagamento for identificado, seu saldo será atualizado automaticamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 mb-3 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors shadow-md cursor-pointer"
          >
            Já paguei, mas não atualizou?
          </button>
          <button
            onClick={() => setIsWaitingTokenPayment(false)}
            className="w-full py-1 text-xs text-gray-400 hover:text-violet-600 underline transition-colors cursor-pointer"
          >
            Cancelar espera
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader clinicName={clinicData?.nome} onSignOut={handleSignOut} />

      <main className="relative container mx-auto px-6 py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-140px] -z-10 h-[260px] bg-gradient-to-br from-emerald-50 via-white to-sky-50"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-120px] top-[120px] -z-10 h-[240px] w-[240px] rounded-full bg-emerald-100/60 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-[-140px] top-[420px] -z-10 h-[280px] w-[280px] rounded-full bg-sky-100/70 blur-3xl"
        />

        {clinicData && (
          <TrialBanner clinicId={clinicData.id} blockAccess={false} />
        )}

        {success && (
          <Alert className="mb-6 border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700">{success}</AlertDescription>
          </Alert>
        )}

        <div className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card className="relative overflow-hidden border-border/60 bg-white/90">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl tracking-tight">
                Bem-vindo, {clinicData?.nome || "Clínica"}
              </CardTitle>
              <CardDescription className="text-sm">
                Visão geral do dia, atendimentos e desempenho do WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {outOfTokens ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-xs font-semibold text-red-700">IA Pausada</p>
                    <p className="mt-1 text-xs text-red-600 leading-tight">
                      A IA não está funcionando. Seus tokens acabaram.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-2 h-7 w-full text-xs"
                      onClick={() => setBuyTokensOpen(true)}
                    >
                      Comprar mais
                    </Button>
                  </div>
                ) : usingPurchasedTokens ? (
                  <div className="rounded-xl border border-border/60 bg-violet-50/60 px-4 py-3">
                    <p className="text-xs text-violet-700">Saldo Extra Disponível</p>
                    <p className="mt-1 text-lg font-semibold text-violet-900">
                      {new Intl.NumberFormat('pt-BR').format(tokensComprados)}
                    </p>
                    <p className="text-[10px] text-violet-700/70">
                      Tokens comprados
                    </p>
                    <Button
                      // variant="outline"
                      size="sm"
                      className="bg-gray-100 border-1 mt-2 h-6 w-full text-[10px] border-violet-200 text-violet-700 hover:bg-violet-100"
                      onClick={() => setBuyTokensOpen(true)}
                    >
                      Comprar mais
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-violet-50/60 px-4 py-3">
                    <p className="text-xs text-violet-700">Tokens utilizados IA</p>
                    <p className="mt-1 text-lg font-semibold text-violet-900">
                      {Math.floor(tokenPercentage)}%
                    </p>
                    <Progress value={tokenPercentage || 0} className="mt-2 h-1.5 bg-violet-200" indicatorClassName="bg-violet-500" />
                    <p className="mt-1 text-[10px] text-violet-700/70">
                      {new Intl.NumberFormat('pt-BR').format(usedPlanTokens)} / {new Intl.NumberFormat('pt-BR').format(totalTokens)}
                    </p>
                  </div>
                )}
                <div className="rounded-xl border border-border/60 bg-emerald-50/60 px-4 py-3">
                  <p className="text-xs text-emerald-700">Consultas hoje</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-900">
                    {todayAppointments.length}
                  </p>
                  <p className="text-xs text-emerald-700/70">{confirmedCount} confirmadas</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-sky-50/70 px-4 py-3">
                  <p className="text-xs text-sky-700">Pendentes</p>
                  <p className="mt-1 text-2xl font-semibold text-sky-900">{pendingCount}</p>
                  <p className="text-xs text-sky-700/70">Aguardando confirmação</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-amber-50/70 px-4 py-3">
                  <p className="text-xs text-amber-700">Próximas</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-900">
                    {upcomingAppointments.length}
                  </p>
                  <p className="text-xs text-amber-700/70">Agendamentos futuros</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => router.push("/dashboard/conversas")} className="gap-2">
                  Ir para conversas
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {clinicData?.calendar_refresh_token ? (
                  <Button
                    className="hover:text-black"
                    variant="outline"
                    onClick={() => {
                      router.push('/dashboard/calendario')
                    }}
                  >
                    Ver calendário
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (clinicData?.id) {
                        window.location.href = `${process.env.NEXT_PUBLIC_URL_SITE!}/auth/login?clinic_id=${clinicData.id}`
                      }
                    }}
                  >
                    Conectar calendário
                  </Button>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Atividade semanal</p>
                  <span className="text-[11px] text-muted-foreground">últimos 7 dias</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Conversas</p>
                    <p className="text-lg font-semibold text-foreground">{weeklyTotal}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Média / dia</p>
                    <p className="text-lg font-semibold text-foreground">{weeklyAvg}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Melhor dia</p>
                    <p className="text-lg font-semibold text-foreground">
                      {bestDay.label !== "-" ? bestDay.label : "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{bestDay.count} conversas</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-emerald-100/60 blur-2xl" />
          </Card>



          <Card className="border-border/60 bg-white/90">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Status do Bot</CardTitle>
                <CardDescription className="text-xs">Automação e WhatsApp</CardDescription>
              </div>
              <Bot className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">IA</p>
                  <p className="text-sm font-medium">
                    {clinicData?.ia_ativa ? "Ativa" : "Inativa"}
                  </p>
                </div>
                <Switch
                  className="cursor-pointer"
                  checked={clinicData?.ia_ativa ?? false}
                  onCheckedChange={handleToggleIA}
                />
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <Badge
                    variant={(uazapiStatus === "connected") ? "default" : "secondary"}
                  >
                    {uazapiStatus === "connected"
                      ? "Conectado"
                      : uazapiStatus === "disconnected"
                        ? "Criado"
                        : uazapiStatus === "connecting"
                          ? "Conectando"
                          : uazapiStatus === "not_configured"
                            ? (hasInstanceToken ? "Criado" : "Sem instância")
                            : uazapiStatus === "error"
                              ? "Erro"
                              : "Desconhecido"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {clinicData?.ia_ativa
                    ? "Bot respondendo automaticamente."
                    : "Bot em modo manual."}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={handleRefreshUazapiStatus}
                disabled={uazapiLoading}
                className="w-full justify-center gap-2"
              >
                <RefreshCw className={uazapiLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Atualizar status
              </Button>

              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
                <p className="text-xs text-muted-foreground">Conexão da instância</p>
                {uazapiQrCode ? (
                  <div className="mt-3 rounded-lg border border-dashed border-border p-4 text-center">
                    <img src={uazapiQrCode} alt="QR Code da instância" className="mx-auto h-36 w-36" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Escaneie o QR Code no WhatsApp da clínica.
                    </p>
                  </div>
                ) : uazapiPairingCode ? (
                  <div className="mt-3 rounded-lg border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground">Código de pareamento</p>
                    <p className="text-lg font-semibold mt-2">{uazapiPairingCode}</p>
                  </div>
                ) : uazapiStatus === "connected" ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Instância conectada e ativa.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Gere um QR Code ou código de pareamento para conectar.
                  </p>
                )}

                <div className="mt-3 grid gap-2">
                  {uazapiStatus === "connected" ? null : (
                    <>
                      <Button
                        onClick={handleCreateUazapiInstance}
                        disabled={
                          uazapiLoading ||
                          hasInstanceToken ||
                          (uazapiStatus !== "not_configured" && uazapiStatus !== "error")
                        }
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        Criar instância
                      </Button>
                      <Button
                        variant="ghost"
                        className="bg-gray-300"
                        onClick={handleConnectUazapi}
                        disabled={uazapiLoading || uazapiStatus === "not_configured"}
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        Gerar QR Code
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    onClick={handleDeleteUazapiInstance}
                    disabled={uazapiLoading || uazapiStatus === "not_configured"}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir instância
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card className="border-border/60 bg-white/90">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:w-1/3">
                <div className="text-3xl font-semibold text-foreground">
                  {newConversationsLoading ? "..." : newConversationsCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Novas conversas iniciadas hoje</p>
                <Button className="mt-3" onClick={() => router.push("/dashboard/conversas")}>
                  Ir para conversas
                </Button>
              </div>
              <div className="relative h-24 w-full md:w-2/3 md:pl-4 overflow-visible">
                <svg viewBox="0 0 100 40" className="h-full w-full overflow-visible">
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-foreground/80"
                    points={chartPoints}
                  />
                  {weeklyConversations.map((item, index) => {
                    const x = weeklyConversations.length <= 1 ? 50 : (index / (weeklyConversations.length - 1)) * 100
                    const y = chartMaxY - (item.count / maxWeekly) * chartRange
                    return (
                      <circle
                        key={item.label}
                        cx={x}
                        cy={y}
                        r="3"
                        className="fill-emerald-500 hover:fill-emerald-600 transition-colors cursor-pointer"
                        onMouseEnter={() => setHoveredPoint({ label: item.label, count: item.count, x, y })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    )
                  })}
                </svg>
                {hoveredPoint && (
                  <div
                    className="absolute z-10 bg-slate-900/90 text-white text-[10px] rounded-md py-1.5 px-2.5 pointer-events-none transform -translate-x-1/2 -translate-y-full shadow-xl ring-1 ring-white/10 backdrop-blur-sm"
                    style={{
                      left: `${hoveredPoint.x}%`,
                      top: `${(hoveredPoint.y / 40) * 100}%`,
                      marginTop: '-8px'
                    }}
                  >
                    <div className="font-bold flex items-center gap-1">
                      {hoveredPoint.count}
                      <span className="font-normal opacity-70">conv.</span>
                    </div>
                    <div className="text-white/60 font-medium whitespace-nowrap">{hoveredPoint.label}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-white/90">
            <CardHeader>
              <CardTitle className="text-base">Atividade semanal</CardTitle>
              <CardDescription className="text-xs">Conversas por dia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {weeklyConversations.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, (item.count / maxWeekly) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground">{item.count}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Dialog open={buyTokensOpen} onOpenChange={setBuyTokensOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Comprar Mais Tokens</DialogTitle>
              <DialogDescription>
                Adicione mais tokens para continuar usando a IA sem interrupções.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Quantidade</span>
                  <span className="text-lg font-bold text-violet-700">{tokenAmount} {tokenAmount === 1 ? "milhão" : "milhões"} de tokens</span>
                </div>

                <Slider
                  defaultValue={[1]}
                  max={50}
                  min={1}
                  step={1}
                  value={[tokenAmount]}
                  onValueChange={(vals) => setTokenAmount(vals[0])}
                  className="py-4"
                />

                <p className="text-xs text-slate-500">
                  Cada 1 milhão de tokens custa <strong>R$ 5,00</strong>.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Total a Pagar</span>
                <span className="text-2xl font-bold text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tokenAmount * 5)}
                </span>
              </div>
            </div>

            <DialogFooter className="sm:justify-end gap-2">
              <Button variant="ghost" onClick={() => setBuyTokensOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleBuyTokens}
                disabled={buyingTokens}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {buyingTokens ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Gerando Pix...
                  </>
                ) : (
                  <>Comprar Agora</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={buyTokensOpen} onOpenChange={setBuyTokensOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Comprar Mais Tokens</DialogTitle>
              <DialogDescription>
                Adicione mais tokens para continuar usando a IA sem interrupções.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Quantidade</span>
                  <span className="text-lg font-bold text-violet-700">{tokenAmount} {tokenAmount === 1 ? "milhão" : "milhões"} de tokens</span>
                </div>

                <Slider
                  defaultValue={[1]}
                  max={50}
                  min={1}
                  step={1}
                  value={[tokenAmount]}
                  onValueChange={(vals) => setTokenAmount(vals[0])}
                  className="py-4"
                />

                <p className="text-xs text-slate-500">
                  Cada 1 milhão de tokens custa <strong>R$ 5,00</strong>.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Total a Pagar</span>
                <span className="text-2xl font-bold text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tokenAmount * 5)}
                </span>
              </div>
            </div>

            <DialogFooter className="sm:justify-end gap-2">
              <Button variant="ghost" onClick={() => setBuyTokensOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleBuyTokens}
                disabled={buyingTokens}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {buyingTokens ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Gerando Pix...
                  </>
                ) : (
                  <>Comprar Agora</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
