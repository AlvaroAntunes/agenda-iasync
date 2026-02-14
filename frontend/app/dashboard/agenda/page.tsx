"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { useClinic } from "@/app/contexts/ClinicContext"
import { ClinicHeader } from "@/components/Header"
import { ClinicLoading } from "@/components/ClinicLoading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlignLeft,
  RefreshCw,
  Loader2,
  Plus,
  AlertCircle,
  TrendingUp
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { logger } from "@/lib/logger"
import { serverFetch } from "@/actions/api-proxy" 

// Helper para formatar datas e gerar dias do mês
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const dayOfWeek = (year: number, month: number, day: number) => new Date(year, month, day).getDay()

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

type CalendarEvent = {
  id: string
  summary: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  location?: string
  status?: string
  profissional_nome?: string
  profissional_id?: string
  calendarSummary?: string
  calendarId?: string
  color?: string
}

// Generate a consistent color based on string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + "00000".substring(0, 6 - c.length) + c;
}

// Get a pastel background color based on string
const getPastelColor = (str: string) => {
  if (!str) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }

  const colors = [
    { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
    { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  ]

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function CalendarPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { clinicData, setClinicData } = useClinic()
  const [loading, setLoading] = useState(true)

  // Estado do Calendário
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([])
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false)
  const [selectedDateDetails, setSelectedDateDetails] = useState<Date | null>(null)

  // Estado para estatísticas
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([])
  const [tomorrowEvents, setTomorrowEvents] = useState<CalendarEvent[]>([])
  const [occupancyRate, setOccupancyRate] = useState(0)
  const [bookingSuccessRate, setBookingSuccessRate] = useState(0)
  const [cancellationRate, setCancellationRate] = useState(0)
  const [avgAppointmentsPerDay, setAvgAppointmentsPerDay] = useState(0)

  // Estado para edição (movido para o topo para evitar erro de hook)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  // Estado para confirmação de exclusão
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null)

  // Estado para criação de novo evento
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newEvent, setNewEvent] = useState({
    summary: "",
    description: "",
    date: "",
    time: ""
  })

  useEffect(() => {
    checkAuthAndLoadClinic()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (clinicData?.id) {
      fetchEvents()
      fetchAppointmentsStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, clinicData?.id])

  const checkAuthAndLoadClinic = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Se não tiver clinicData no contexto, carrega
      if (!clinicData) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('clinic_id, role')
          .eq('id', user.id)
          .single()

        if (!profile || !profile.clinic_id) {
          router.push('/login')
          return
        }

        const { data: clinic } = await supabase
          .from('clinicas')
          .select('*')
          .eq('id', profile.clinic_id)
          .single()

        setClinicData(clinic)
      }
    } catch (error) {
      logger.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (allEvents: CalendarEvent[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfterTomorrow = new Date(tomorrow)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

    // Debug Stats
    logger.log(`📊 CalculateStats: ${allEvents.length} eventos totais`)
    const byCal = allEvents.reduce((acc: any, e) => {
      const k = e.calendarSummary || 'primary'
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})
    logger.log(`📊 Por Calendário:`, byCal)

    const next7Days = new Date(today)
    next7Days.setDate(next7Days.getDate() + 7)

    // Filter events for today
    const todayEvts = allEvents.filter(e => {
      const d = new Date(e.start.dateTime)
      return d >= today && d < tomorrow
    })

    // Filter events for tomorrow
    const tomorrowEvts = allEvents.filter(e => {
      const d = new Date(e.start.dateTime)
      return d >= tomorrow && d < dayAfterTomorrow
    })

    // Filter events for next 7 days
    const next7DaysEvts = allEvents.filter(e => {
      const d = new Date(e.start.dateTime)
      return d >= today && d < next7Days
    })

    // Calculate occupancy rate (assuming 8-hour workday, 30min slots = 16 slots/day * 7 days)
    const totalSlots = 16 * 7
    const occupiedSlots = next7DaysEvts.length
    const rate = Math.min(100, Math.round((occupiedSlots / totalSlots) * 100))

    setTodayEvents(todayEvts)
    setTomorrowEvents(tomorrowEvts)
    setOccupancyRate(rate)
  }

  const fetchAppointmentsStats = async () => {
    if (!clinicData?.id) return

    try {
      // Get appointments from last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: appointments, error } = await supabase
        .from('consultas')
        .select('id, status, horario_consulta')
        .eq('clinic_id', clinicData.id)
        .gte('horario_consulta', thirtyDaysAgo.toISOString())

      if (error) throw error

      // Calculate cancellation rate
      const total = appointments?.length || 0
      const cancelled = appointments?.filter(
        (a: { status: string }) => a.status === 'CANCELADO' || a.status === 'FALTOU'
      ).length || 0
      const cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0

      // Calculate average per day (last 30 days)
      const avgPerDay = total > 0 ? (total / 30).toFixed(1) : '0.0'

      setCancellationRate(cancelRate)
      setAvgAppointmentsPerDay(parseFloat(avgPerDay))

      // Calculate booking success rate
      // Get all leads with tags
      const { data: leadTags, error: leadTagsError } = await supabase
        .from('lead_tags')
        .select('lead_id, tag_id, tags(name)')
        .eq('clinic_id', clinicData.id)

      if (leadTagsError) throw leadTagsError

      // Group tags by lead_id
      const leadTagsMap = new Map<string, string[]>()
      leadTags?.forEach((lt: any) => {
        const leadId = lt.lead_id
        const tagName = lt.tags?.name
        if (!leadTagsMap.has(leadId)) {
          leadTagsMap.set(leadId, [])
        }
        if (tagName) {
          leadTagsMap.get(leadId)!.push(tagName)
        }
      })

      // Count total leads and leads with "Agendado" tag
      const totalLeads = leadTagsMap.size
      let leadsBooked = 0

      leadTagsMap.forEach((tags) => {
        if (tags.includes('Agendado')) {
          leadsBooked++
        }
      })

      // Calculate success rate
      const successRate = totalLeads > 0
        ? Math.round((leadsBooked / totalLeads) * 100)
        : 0

      setBookingSuccessRate(successRate)
    } catch (error) {
      logger.error('Error fetching appointments stats:', error)
    }
  }

  const fetchEvents = async () => {
    if (!clinicData?.id) return

    setLoadingEvents(true)
    try {
      // Calcular range do mês atual (start e end)
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()

      // Pegar do dia 1 do mês até o último dia do mês
      // Ajuste: pegar alguns dias antes e depois para preencher a grid se quiser (opcional)
      // Por enquanto, vamos pegar STRICTLY o mês, o backend filtra.

      const startDate = new Date(year, month, 1)
      startDate.setDate(startDate.getDate() - 7) // Pega final do mês anterior

      const endDate = new Date(year, month + 1, 0, 23, 59, 59)
      endDate.setDate(endDate.getDate() + 7) // Pega início do mês seguinte

      const url = `${process.env.NEXT_PUBLIC_API_URL}/calendars/events/${clinicData.id}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`

      const response = await serverFetch(url)
      if (!response.ok) {
        const err = response.data
        throw new Error(err.detail || "Erro ao buscar eventos")
      }

      const data = response.data
      const fetchedEvents = data.events || []
      setEvents(fetchedEvents)

      // Calculate statistics with all events (not just current month)
      calculateStats(fetchedEvents)

    } catch (error) {
      logger.error("Erro ao buscar eventos do calendário:", error)
      toast.error("Erro ao sincronizar calendário.")
    } finally {
      setLoadingEvents(false)
    }
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleMonthYearChange = (month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1))
  }

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const daysEvents = getEventsForDay(day)

    setSelectedDateDetails(clickedDate)
    setSelectedDayEvents(daysEvents)
    setIsDayDialogOpen(true)
  }

  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime)
      return eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
    })
  }

  if (loading) return <ClinicLoading />

  // Renderização da Grid
  const renderCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const totalDays = daysInMonth(year, month)
    const firstDayIndex = dayOfWeek(year, month, 1) // 0 = Dom, 1 = Seg...

    const days = []

    // Preenchimento vazio para dias antes do dia 1
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-16 sm:h-24 md:h-32 bg-gray-50/30 border border-gray-100/50"></div>)
    }

    // Dias do mês
    for (let day = 1; day <= totalDays; day++) {
      const dayEvents = getEventsForDay(day)
      const isToday =
        day === new Date().getDate() &&
        month === new Date().getMonth() &&
        year === new Date().getFullYear()

      days.push(
        <div
          key={day}
          onClick={() => handleDayClick(day)}
          className={`
            h-16 sm:h-24 md:h-32 border border-gray-100 p-1 sm:p-2 relative group cursor-pointer transition-colors
            ${isToday ? 'bg-violet-50/50' : 'bg-white hover:bg-gray-50'}
          `}
        >
          <div className="flex justify-between items-start">
            <span className={`
              text-[10px] sm:text-sm font-medium h-5 w-5 sm:h-7 sm:w-7 flex items-center justify-center rounded-full
              ${isToday ? 'bg-violet-600 text-white' : 'text-gray-700 group-hover:bg-gray-200'}
            `}>
              {day}
            </span>
            {dayEvents.length > 0 && (
              <Badge variant="secondary" className="text-[8px] sm:text-[10px] h-4 sm:h-5 px-1 sm:px-1.5 bg-violet-100 text-violet-700 border-none">
                {dayEvents.length}
              </Badge>
            )}
          </div>

          <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1 overflow-hidden max-h-[calc(100%-24px)] sm:max-h-[calc(100%-32px)]">
            {dayEvents.slice(0, 2).map((event, idx) => {
              // Determine identifier for color generation (Professional Name > Calendar Name > Event Summary)
              const colorKey = event.profissional_nome || event.calendarSummary || event.summary || 'default'
              const colorStyle = getPastelColor(colorKey)

              return (
                <div
                  key={idx}
                  className={`text-[8px] sm:text-[10px] truncate px-1 sm:px-1.5 py-0.5 rounded border border-l-2 hidden sm:block ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border} border-l-current`}
                >
                  <span className="font-semibold mr-1">
                    {new Date(event.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>{event.summary}</span>
                  {/* Optional: Show professional name if available */}
                  {(event.profissional_nome || event.calendarSummary) && (
                    <span className="ml-1 opacity-70 text-[8px]">
                      ({event.profissional_nome || event.calendarSummary})
                    </span>
                  )}
                </div>
              )
            })}
            {dayEvents.length > 2 && (
              <div className="text-[8px] sm:text-[10px] text-gray-400 pl-1 hidden sm:block">
                + {dayEvents.length - 2} mais
              </div>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setClinicData(null)
    router.push('/login')
  }



  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent || !clinicData?.id) return

    try {
      setLoadingEvents(true)
      const calendarId = editingEvent.calendarId || 'primary'
      const response = await serverFetch(`${process.env.NEXT_PUBLIC_API_URL}/calendars/events/${clinicData.id}/${editingEvent.id}?calendar_id=${encodeURIComponent(calendarId)}`, {
        method: "PATCH",
        body: {
          summary: editingEvent.summary,
          description: editingEvent.description,
          start: editingEvent.start,
          end: editingEvent.end
        }
      })

      if (!response.ok) throw new Error("Erro ao atualizar evento")

      toast.success("Evento atualizado com sucesso")
      setIsDayDialogOpen(false)
      setEditingEvent(null)
      fetchEvents()
    } catch (err) {
      toast.error("Erro ao atualizar evento")
      logger.error(err)
    } finally {
      setLoadingEvents(false)
    }
  }



  const confirmDelete = async () => {
    if (!eventToDelete) return

    try {
      setLoadingEvents(true)
      const calendarId = eventToDelete.calendarId || 'primary'
      const response = await serverFetch(`${process.env.NEXT_PUBLIC_API_URL}/calendars/events/${clinicData?.id}/${eventToDelete.id}?calendar_id=${encodeURIComponent(calendarId)}`, {
        method: "DELETE"
      })

      if (!response.ok) throw new Error("Erro ao excluir evento")

      toast.success("Evento excluído com sucesso")
      setEventToDelete(null)
      setIsDayDialogOpen(false)
      fetchEvents()
    } catch (err) {
      toast.error("Erro ao excluir evento")
      logger.error(err)
    } finally {
      setLoadingEvents(false)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clinicData?.id) return

    // Validações
    if (!newEvent.summary.trim()) {
      toast.error("O título do evento é obrigatório")
      return
    }

    if (!newEvent.date || !newEvent.time) {
      toast.error("Data e hora são obrigatórios")
      return
    }

    try {
      setLoadingEvents(true)

      // Combina data e hora em formato ISO
      const startDateTime = `${newEvent.date}T${newEvent.time}:00`

      const response = await serverFetch(`${process.env.NEXT_PUBLIC_API_URL}/calendars/events/${clinicData.id}`, {
        method: "POST",
        body: {
          summary: newEvent.summary,
          description: newEvent.description,
          start: startDateTime
        }
      })

      if (!response.ok) throw new Error("Erro ao criar evento")

      toast.success("Evento criado com sucesso")
      setIsCreateDialogOpen(false)
      setNewEvent({ summary: "", description: "", date: "", time: "" })
      fetchEvents()
    } catch (err) {
      toast.error("Erro ao criar evento")
      logger.error(err)
    } finally {
      setLoadingEvents(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader clinicName={clinicData?.nome} onSignOut={handleSignOut} />

      <main className="container mx-auto px-2 sm:px-6 py-4 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground mt-1 text-sm hidden sm:block">
              Visualize seus agendamentos sincronizados com o Google Calendar.
            </p>
          </div>
          <div className="flex gap-1 sm:gap-2">
            <Button
              className="mr-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20 font-semibold transition-all text-xs sm:text-sm px-2 sm:px-4"
              onClick={() => {
                const today = new Date()
                const dateStr = today.toISOString().split('T')[0]
                const timeStr = today.toTimeString().slice(0, 5)
                setNewEvent({ summary: "", description: "", date: dateStr, time: timeStr })
                setIsCreateDialogOpen(true)
              }}
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Evento</span>
            </Button>
            <Button className="mr-3 bg-gray-200 text-black border-1 border-gray-300 hover:bg-gray-300 hover:text-black" size="icon" onClick={fetchEvents} disabled={loadingEvents}>
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loadingEvents ? 'animate-spin' : ''}`} />
            </Button>
            <Button className="bg-gray-200 text-black border-1 border-gray-300 hover:bg-gray-300 hover:text-black text-xs sm:text-sm px-2 sm:px-4" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Taxa de Ocupação (7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{occupancyRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Próximos 7 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Consultas Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{todayEvents.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {todayEvents.filter(e => new Date(e.start.dateTime) > new Date()).length} restantes
              </p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Consultas Amanhã
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{tomorrowEvents.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Agendadas
              </p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Taxa de Sucesso do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{bookingSuccessRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Leads que agendaram consulta
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Taxa de Cancelamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{cancellationRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Média de Consultas/Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{avgAppointmentsPerDay}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60 bg-white/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-2 sm:py-4 px-2 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Select
                  value={currentDate.getMonth().toString()}
                  onValueChange={(value) => handleMonthYearChange(parseInt(value), currentDate.getFullYear())}
                >
                  <SelectTrigger className="w-[120px] sm:w-[140px] h-8 sm:h-9 text-sm sm:text-base font-semibold cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem className="cursor-pointer" key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={currentDate.getFullYear().toString()}
                  onValueChange={(value) => handleMonthYearChange(currentDate.getMonth(), parseInt(value))}
                >
                  <SelectTrigger className="w-[90px] sm:w-[100px] h-8 sm:h-9 text-sm sm:text-base font-semibold cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => (
                      <SelectItem className="cursor-pointer" key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-md p-0.5 sm:p-1">
                <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-8 sm:w-8" onClick={prevMonth}>
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-8 sm:w-8" onClick={nextMonth}>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Cabeçalho dias da semana */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
              {DAYS_SHORT.map(day => (
                <div key={day} className="py-1 sm:py-2 text-center text-[10px] sm:text-sm font-semibold text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid do Mês */}
            <div className="grid grid-cols-7 border-l border-b border-gray-200">
              {renderCalendarDays()}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Modal de Detalhes do Dia */}
      <Dialog open={isDayDialogOpen} onOpenChange={(open) => {
        setIsDayDialogOpen(open)
        if (!open) setEditingEvent(null)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize flex items-center gap-2">
              <div className="bg-violet-100 p-2 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-violet-600" />
              </div>
              {selectedDateDetails?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {editingEvent ? (
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Título</label>
                  <input
                    type="text"
                    className="w-full mt-1 p-2 border rounded-md"
                    value={editingEvent.summary}
                    onChange={e => setEditingEvent({ ...editingEvent, summary: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-sm font-medium">Data</label>
                    <input
                      type="date"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={(() => {
                        const d = new Date(editingEvent.start.dateTime)
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                      })()}
                      onChange={e => {
                        const newDate = e.target.value
                        if (!newDate) return

                        const startD = new Date(editingEvent.start.dateTime)
                        const endD = new Date(editingEvent.end.dateTime)

                        const startTime = startD.getHours().toString().padStart(2, '0') + ':' + startD.getMinutes().toString().padStart(2, '0')
                        const endTime = endD.getHours().toString().padStart(2, '0') + ':' + endD.getMinutes().toString().padStart(2, '0')

                        const newStart = new Date(`${newDate}T${startTime}:00`)
                        const newEnd = new Date(`${newDate}T${endTime}:00`)

                        setEditingEvent({
                          ...editingEvent,
                          start: { ...editingEvent.start, dateTime: newStart.toISOString() },
                          end: { ...editingEvent.end, dateTime: newEnd.toISOString() }
                        })
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Início</label>
                    <input
                      type="time"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={new Date(editingEvent.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      onChange={e => {
                        const newTime = e.target.value
                        if (!newTime) return

                        const d = new Date(editingEvent.start.dateTime)
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

                        const newStart = new Date(`${dateStr}T${newTime}:00`)

                        setEditingEvent({
                          ...editingEvent,
                          start: { ...editingEvent.start, dateTime: newStart.toISOString() }
                        })
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fim</label>
                    <input
                      type="time"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={new Date(editingEvent.end.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      onChange={e => {
                        const newTime = e.target.value
                        if (!newTime) return

                        const d = new Date(editingEvent.end.dateTime)
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

                        const newEnd = new Date(`${dateStr}T${newTime}:00`)

                        setEditingEvent({
                          ...editingEvent,
                          end: { ...editingEvent.end, dateTime: newEnd.toISOString() }
                        })
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <textarea
                    className="w-full mt-1 p-2 border rounded-md"
                    value={editingEvent.description || ""}
                    onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button className="rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-500 transition-colors" type="button" onClick={() => setEditingEvent(null)} disabled={loadingEvents}>Cancelar</Button>
                  <Button className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20 font-semibold transition-all" type="submit" disabled={loadingEvents}>
                    {loadingEvents ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </div>
              </form>
            ) : selectedDayEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum evento para este dia.</p>
              </div>
            ) : (
              selectedDayEvents.map((evt, idx) => {
                const colorKey = evt.profissional_nome || evt.calendarSummary || evt.summary || 'default'
                const colorStyle = getPastelColor(colorKey)
                const borderColor = colorStyle.border.replace('border-', 'bg-').replace('200', '500')

                return (
                  <div key={idx} className={`p-3 bg-white border ${colorStyle.border} rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderColor}`} />
                    <div className="flex items-start justify-between pl-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm">{evt.summary}</h4>

                        {(evt.profissional_nome || evt.calendarSummary) && (
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${colorStyle.bg} ${colorStyle.text} border-none font-medium`}>
                              {evt.profissional_nome || evt.calendarSummary}
                            </Badge>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {new Date(evt.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(evt.end.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {evt.location && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {evt.location}
                          </div>
                        )}
                        {evt.description && (
                          <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 italic">
                            {evt.description}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-blue-600" onClick={() => setEditingEvent(evt)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-red-600" onClick={() => setEventToDelete(evt)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Evento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Tem certeza que deseja excluir o evento <strong>{eventToDelete?.summary}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button className="rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-500 transition-colors" onClick={() => setEventToDelete(null)} disabled={loadingEvents}>Cancelar</Button>
            <Button className="!bg-red-600 hover:!bg-red-700 text-white" variant="destructive" onClick={confirmDelete} disabled={loadingEvents}>
              {loadingEvents ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação de Evento */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-cyan-100 p-2 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-cyan-600" />
              </div>
              Novo Evento
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateEvent} className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Título *</label>
              <input
                type="text"
                className="w-full mt-1 p-2 border rounded-md"
                value={newEvent.summary}
                onChange={e => setNewEvent({ ...newEvent, summary: e.target.value })}
                placeholder="Ex: Consulta com Dr. Silva"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Data *</label>
                <input
                  type="date"
                  className="w-full mt-1 p-2 border rounded-md"
                  value={newEvent.date}
                  onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Hora *</label>
                <input
                  type="time"
                  className="w-full mt-1 p-2 border rounded-md"
                  value={newEvent.time}
                  onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Descrição</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md"
                value={newEvent.description}
                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Informações adicionais (opcional)"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                className="rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-500 transition-colors"
                type="button"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={loadingEvents}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20 font-semibold transition-all"
                type="submit"
                disabled={loadingEvents}
              >
                {loadingEvents ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Evento"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
