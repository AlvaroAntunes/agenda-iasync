"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Bot, 
  Settings, 
  Building2, 
  ChevronRight,
  CheckCircle2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"

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

type ClinicData = {
  id: string
  nome: string
  email: string
  telefone: string
  endereco: string
  uf: string
  cidade: string
  prompt_ia: string
  ia_ativa: boolean
  plano: 'basic' | 'premium' | 'enterprise'
  tipo_calendario: 'google' | 'outlook'
}

export default function ClinicDashboard() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [selectedDate, setSelectedDate] = useState("2025-01-15")
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState("")
  const [clinicData, setClinicData] = useState<ClinicData | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])

  useEffect(() => {
    checkAuthAndLoadClinic()
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

      setClinicData(clinic)
      
      // Carregar consultas da clínica
      await loadAppointments(profile.clinic_id)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
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
          paciente:lids!paciente_id (
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

      const appointments = appointmentsData || []
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
      console.error('Erro ao carregar consultas:', error)
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
      console.error('Erro ao atualizar status da IA:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
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
      {/* Header */}
      <header className="border-b bg-card">
        <div className="w-full px-4 md:px-8 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{clinicData?.nome || 'Carregando...'}</h1>
                <p className="text-sm text-muted-foreground">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/settings">
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" onClick={handleSignOut}>Sair</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
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
                      {new Date(selectedDate).toLocaleDateString("pt-BR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </div>
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
          </div>
        </div>
      </main>
    </div>
  )
}
