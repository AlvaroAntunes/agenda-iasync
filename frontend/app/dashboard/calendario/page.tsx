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
  Plus
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, clinicData?.id])

  const checkAuthAndLoadClinic = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login/clinic')
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
          router.push('/login/clinic')
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
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
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
      const endDate = new Date(year, month + 1, 0, 23, 59, 59)

      const url = `${process.env.NEXT_PUBLIC_API_URL}/calendars/events/${clinicData.id}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`

      const response = await fetch(url)
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || "Erro ao buscar eventos")
      }

      const data = await response.json()
      setEvents(data.events || [])

    } catch (error) {
      console.error("Erro ao buscar eventos do calendário:", error)
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
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-gray-50/30 border border-gray-100/50"></div>)
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
            h-24 md:h-32 border border-gray-100 p-2 relative group cursor-pointer transition-colors
            ${isToday ? 'bg-violet-50/50' : 'bg-white hover:bg-gray-50'}
          `}
        >
          <div className="flex justify-between items-start">
            <span className={`
              text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full
              ${isToday ? 'bg-violet-600 text-white' : 'text-gray-700 group-hover:bg-gray-200'}
            `}>
              {day}
            </span>
            {dayEvents.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-violet-100 text-violet-700 border-none">
                {dayEvents.length}
              </Badge>
            )}
          </div>

          <div className="mt-2 space-y-1 overflow-hidden max-h-[calc(100%-32px)]">
            {dayEvents.slice(0, 3).map((event, idx) => (
              <div key={idx} className="text-[10px] truncate px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 border-l-2 border-l-blue-500">
                {new Date(event.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {event.summary}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-[10px] text-gray-400 pl-1">
                + {dayEvents.length - 3} mais
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
    router.push('/login/clinic')
  }



  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent || !clinicData?.id) return

    try {
      setLoadingEvents(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendars/events/${clinicData.id}/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: editingEvent.summary,
          description: editingEvent.description
        })
      })

      if (!response.ok) throw new Error("Erro ao atualizar evento")

      toast.success("Evento atualizado com sucesso")
      setIsDayDialogOpen(false)
      setEditingEvent(null)
      fetchEvents()
    } catch (err) {
      toast.error("Erro ao atualizar evento")
      console.error(err)
    } finally {
      setLoadingEvents(false)
    }
  }



  const confirmDelete = async () => {
    if (!eventToDelete) return

    try {
      setLoadingEvents(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendars/events/${clinicData?.id}/${eventToDelete.id}`, {
        method: "DELETE"
      })

      if (!response.ok) throw new Error("Erro ao excluir evento")

      toast.success("Evento excluído com sucesso")
      setEventToDelete(null)
      setIsDayDialogOpen(false)
      fetchEvents()
    } catch (err) {
      toast.error("Erro ao excluir evento")
      console.error(err)
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendars/events/${clinicData.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: newEvent.summary,
          description: newEvent.description,
          start: startDateTime
        })
      })

      if (!response.ok) throw new Error("Erro ao criar evento")

      toast.success("Evento criado com sucesso")
      setIsCreateDialogOpen(false)
      setNewEvent({ summary: "", description: "", date: "", time: "" })
      fetchEvents()
    } catch (err) {
      toast.error("Erro ao criar evento")
      console.error(err)
    } finally {
      setLoadingEvents(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader clinicName={clinicData?.nome} onSignOut={handleSignOut} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendário</h1>
            <p className="text-muted-foreground mt-1">
              Visualize seus agendamentos sincronizados com o Google Calendar.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20 font-semibold transition-all"
              onClick={() => {
                const today = new Date()
                const dateStr = today.toISOString().split('T')[0]
                const timeStr = today.toTimeString().slice(0, 5)
                setNewEvent({ summary: "", description: "", date: dateStr, time: timeStr })
                setIsCreateDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
            <Button className="bg-gray-200 text-black border-1 border-gray-300 hover:bg-gray-300 hover:text-black" size="icon" onClick={fetchEvents} disabled={loadingEvents}>
              <RefreshCw className={`h-4 w-4 ${loadingEvents ? 'animate-spin' : ''}`} />
            </Button>
            <Button className="bg-gray-200 text-black border-1 border-gray-300 hover:bg-gray-300 hover:text-black" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
          </div>
        </div>

        <Card className="border-border/60 bg-white/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-semibold text-gray-800 capitalize w-48">
                {MONTHS[currentDate.getMonth()]} <span className="text-gray-400">{currentDate.getFullYear()}</span>
              </h2>
              <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Cabeçalho dias da semana */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
              {DAYS_SHORT.map(day => (
                <div key={day} className="py-2 text-center text-sm font-semibold text-gray-500">
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
              selectedDayEvents.map((evt, idx) => (
                <div key={idx} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500" />
                  <div className="flex items-start justify-between pl-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm">{evt.summary}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
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
                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                          {evt.description}
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-blue-600" onClick={() => setEditingEvent(evt)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-red-600" onClick={() => setEventToDelete(evt)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
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
            <Button variant="destructive" onClick={confirmDelete} disabled={loadingEvents}>
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
