"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
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
import { useClinic } from "@/app/contexts/ClinicContext"

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

  useEffect(() => {
    checkAuthAndLoadClinic()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        .select('*')
        .eq('id', profile.clinic_id)
        .single()

      if (clinicError) throw clinicError

      if (clinicError) throw clinicError

      setClinicData(clinic)

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

  const apiBaseUrl = process.env.BACKEND_URL || ""

  const normalizeQrCode = (value?: string | null) => {
    if (!value) return null
    if (value.startsWith("data:")) return value
    return `data:image/png;base64,${value}`
  }

  const resolveUazapiStatus = (data: any) => {
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
      data?.qr ||
      data?.qrCode ||
      data?.code ||
      data?.data?.qrcode ||
      null
    )
  }

  const resolveUazapiPairingCode = (data: any) => {
    return data?.pairingCode || data?.pairing_code || data?.code || null
  }

  const fetchUazapiStatus = async (clinicId: string) => {
    if (!apiBaseUrl) return
    try {
      const response = await fetch(`${apiBaseUrl}/uazapi/instance/status/${clinicId}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.detail || "Erro ao consultar status")
      }
      const status = resolveUazapiStatus(data)
      setUazapiStatus(status)
      setUazapiQrCode(normalizeQrCode(resolveUazapiQr(data)))
      setUazapiPairingCode(resolveUazapiPairingCode(data))
    } catch (err) {
      logger.error("Erro ao buscar status Uazapi:", err)
      setUazapiStatus("error")
    }
  }

  const handleCreateUazapiInstance = async () => {
    if (!clinicData?.id || !apiBaseUrl) return
    setUazapiLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/uazapi/instance/create/${clinicData.id}`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.detail || "Erro ao criar instância")
      }
      toast.success("Instância criada")
      await fetchUazapiStatus(clinicData.id)
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar instância")
    } finally {
      setUazapiLoading(false)
    }
  }

  const handleConnectUazapi = async () => {
    if (!clinicData?.id || !apiBaseUrl) return
    setUazapiLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/uazapi/instance/connect/${clinicData.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.detail || "Erro ao gerar QR code")
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

  const handleDeleteUazapiInstance = async () => {
    if (!clinicData?.id || !apiBaseUrl) return
    setUazapiLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/uazapi/instance/${clinicData.id}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.detail || "Erro ao excluir instância")
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

  const getStatusBadge = (status: string) => {
    if (status === "confirmed") {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Confirmado</Badge>
    }
    if (status === "pending") {
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pendente</Badge>
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader clinicName={clinicData?.nome} onSignOut={handleSignOut} />

      <main className="container mx-auto px-6 py-8">
        {/* Trial Banner */}
        {clinicData && (
          <TrialBanner clinicId={clinicData.id} blockAccess={false} />
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Consultas Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{todayAppointments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{confirmedCount} confirmadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{pendingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Aguardando confirmação</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Próximas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{upcomingAppointments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Nos próximos dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bot WhatsApp</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${clinicData?.ia_ativa ? 'bg-green-500' : 'bg-red-400'}`} />
                  <span className="text-sm font-medium text-foreground">
                    {clinicData?.ia_ativa ? 'IA Ativa' : 'IA Inativa'}
                  </span>
                </div>
                <Switch
                  checked={clinicData?.ia_ativa ?? false}
                  onCheckedChange={handleToggleIA}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {clinicData?.ia_ativa
                  ? 'Bot respondendo automaticamente'
                  : 'Bot em modo manual'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Today's Appointments */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Consultas de Hoje</CardTitle>
                    <CardDescription>
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString("pt-BR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        timeZone: "America/Sao_Paulo"
                      })}
                    </CardDescription>
                  </div>
                  {clinicData?.calendar_refresh_token ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const calendarUrl = clinicData?.tipo_calendario === 'google'
                          ? 'https://calendar.google.com'
                          : 'https://outlook.live.com/calendar'
                        window.open(calendarUrl, '_blank')
                      }}
                    >
                      Ver Calendário
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        if (clinicData?.id) {
                          window.location.href = `${process.env.NEXT_PUBLIC_URL_SITE!}/auth/login?clinic_id=${clinicData.id}`
                        }
                      }}
                    >
                      Conectar Calendário
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todayAppointments.length === 0 ? (
                    <div className="py-12 text-center">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Nenhuma consulta agendada para hoje</p>
                    </div>
                  ) : (
                    todayAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{appointment.paciente?.nome || 'Paciente não identificado'}</h3>
                              {getStatusBadge(appointment.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(appointment.horario_consulta).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {appointment.profissional && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {appointment.profissional.nome}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {appointment.paciente?.telefone || 'Sem telefone'}
                              </span>
                            </div>
                            {appointment.profissional?.especialidade && (
                              <div className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {appointment.profissional.especialidade}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Appointments */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Próximas Consultas</CardTitle>
                <CardDescription>Agendamentos futuros</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingAppointments.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{appointment.paciente?.nome || 'Paciente não identificado'}</p>
                        {appointment.profissional && (
                          <p className="text-xs text-muted-foreground mt-0.5">{appointment.profissional.nome}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(appointment.horario_consulta).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(appointment.horario_consulta).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4 bg-transparent">
                  Ver Todas
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Instância WhatsApp</CardTitle>
                  <CardDescription>Uazapi</CardDescription>
                </div>
                <QrCode className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant={uazapiStatus === "connected" ? "default" : "secondary"}
                  >
                    {uazapiStatus === "connected"
                      ? "Conectado"
                      : uazapiStatus === "connecting"
                        ? "Conectando"
                        : uazapiStatus === "disconnected"
                          ? "Desconectado"
                          : uazapiStatus === "not_configured"
                            ? "Sem instância"
                            : uazapiStatus === "error"
                              ? "Erro"
                              : "Desconhecido"}
                  </Badge>
                </div>

                {uazapiQrCode ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center">
                    <img src={uazapiQrCode} alt="QR Code da instância" className="mx-auto h-48 w-48" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Escaneie o QR Code no WhatsApp da clínica.
                    </p>
                  </div>
                ) : uazapiPairingCode ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground">Código de pareamento</p>
                    <p className="text-lg font-semibold mt-2">{uazapiPairingCode}</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    Gere um QR Code ou código de pareamento para conectar.
                  </div>
                )}

                <div className="grid gap-2">
                  <Button onClick={handleCreateUazapiInstance} disabled={uazapiLoading}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Criar instância
                  </Button>
                  <Button variant="outline" onClick={handleConnectUazapi} disabled={uazapiLoading}>
                    <QrCode className="mr-2 h-4 w-4" />
                    Gerar QR Code
                  </Button>
                  <Button variant="ghost" onClick={handleDeleteUazapiInstance} disabled={uazapiLoading}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir instância
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
