"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { useClinic } from "@/app/contexts/ClinicContext"
import { ClinicHeader } from "@/components/Header"
import { ClinicLoading } from "@/components/ClinicLoading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Check, X, Ban, Search, Calendar } from "lucide-react"
import { toast } from "sonner"
import { logger } from "@/lib/logger"

type Appointment = {
    id: string
    horario_consulta: string
    status: 'AGENDADA' | 'COMPARECEU' | 'FALTOU' | 'CANCELADO'
    origem_agendamento: 'IA' | 'MANUAL'
    leads: {
        nome: string
        telefone: string
    }
}

const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, { label: string; className: string }> = {
        AGENDADA: { label: 'Agendada', className: 'bg-blue-100 text-blue-700 border-blue-200' },
        COMPARECEU: { label: 'Compareceu', className: 'bg-green-100 text-green-700 border-green-200' },
        FALTOU: { label: 'Faltou', className: 'bg-red-100 text-red-700 border-red-200' },
        CANCELADO: { label: 'Cancelado', className: 'bg-gray-100 text-gray-700 border-gray-200' }
    }

    const config = variants[status] || variants.AGENDADA

    return (
        <Badge variant="outline" className={config.className}>
            {config.label}
        </Badge>
    )
}

export default function ConsultasPage() {
    const router = useRouter()
    const supabase = getSupabaseBrowserClient()
    const { clinicData, setClinicData } = useClinic()
    const [loading, setLoading] = useState(true)
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today')
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    useEffect(() => {
        checkAuthAndLoadClinic()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (clinicData?.id) {
            fetchAppointments()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clinicData?.id, dateFilter, selectedYear])

    const checkAuthAndLoadClinic = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

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

    const fetchAppointments = async () => {
        if (!clinicData?.id) return

        setLoading(true)
        try {
            let query = supabase
                .from('consultas')
                .select(`
          id,
          horario_consulta,
          status,
          origem_agendamento,
          leads:paciente_id (
            nome,
            telefone
          )
        `)
                .eq('clinic_id', clinicData.id)

            if (dateFilter !== 'all') {
                const now = new Date()
                let startDate = new Date()
                let endDate = new Date()

                if (dateFilter === 'today') {
                    startDate.setHours(0, 0, 0, 0)
                    endDate.setHours(23, 59, 59, 999)
                } else if (dateFilter === 'week') {
                    startDate.setDate(now.getDate() - now.getDay())
                    startDate.setHours(0, 0, 0, 0)
                    endDate.setDate(startDate.getDate() + 6)
                    endDate.setHours(23, 59, 59, 999)
                } else if (dateFilter === 'month') {
                    startDate.setDate(1)
                    startDate.setHours(0, 0, 0, 0)
                    endDate.setMonth(startDate.getMonth() + 1, 0)
                    endDate.setHours(23, 59, 59, 999)
                } else if (dateFilter === 'year') {
                    startDate = new Date(selectedYear, 0, 1, 0, 0, 0, 0)
                    endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999)
                }

                query = query
                    .gte('horario_consulta', startDate.toISOString())
                    .lte('horario_consulta', endDate.toISOString())
            }

            const { data, error } = await query.order('horario_consulta', { ascending: true })

            if (error) throw error
            setAppointments(data || [])
        } catch (error) {
            logger.error('Erro ao buscar consultas:', error)
            toast.error('Erro ao carregar consultas')
        } finally {
            setLoading(false)
        }
    }

    const updateAppointmentStatus = async (
        appointmentId: string,
        newStatus: 'COMPARECEU' | 'FALTOU' | 'CANCELADO'
    ) => {
        setUpdatingId(appointmentId)
        try {
            const { error } = await supabase
                .from('consultas')
                .update({ status: newStatus })
                .eq('id', appointmentId)
                .eq('clinic_id', clinicData?.id)

            if (error) throw error

            toast.success(`Status atualizado para ${newStatus}`)
            fetchAppointments()
        } catch (error) {
            logger.error('Erro ao atualizar status:', error)
            toast.error('Erro ao atualizar status')
        } finally {
            setUpdatingId(null)
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        setClinicData(null)
        router.push('/login')
    }

    // Helper function to remove accents for search
    const removeAccents = (str: string) => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    }

    const filteredAppointments = appointments.filter(apt => {
        const searchNormalized = removeAccents(searchQuery.toLowerCase())
        const nameNormalized = removeAccents(apt.leads?.nome?.toLowerCase() || '')
        return nameNormalized.includes(searchNormalized)
    })

    if (loading && !clinicData) return <ClinicLoading />

    return (
        <div className="min-h-screen bg-background">
            <ClinicHeader clinicName={clinicData?.nome} onSignOut={handleSignOut} />

            <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground">Consultas</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie o status das consultas agendadas
                    </p>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Date Filter Buttons */}
                            <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                                <Button
                                    variant={dateFilter === 'today' ? 'default' : 'outline'}
                                    onClick={() => setDateFilter('today')}
                                    className={`w-full sm:w-auto ${dateFilter === 'today' ? 'bg-cyan-600 hover:bg-cyan-700' : 'hover:text-black'}`}
                                >
                                    Hoje
                                </Button>
                                <Button
                                    variant={dateFilter === 'week' ? 'default' : 'outline'}
                                    onClick={() => setDateFilter('week')}
                                    className={`w-full sm:w-auto ${dateFilter === 'week' ? 'bg-cyan-600 hover:bg-cyan-700' : 'hover:text-black'}`}
                                >
                                    Semana
                                </Button>
                                <Button
                                    variant={dateFilter === 'month' ? 'default' : 'outline'}
                                    onClick={() => setDateFilter('month')}
                                    className={`w-full sm:w-auto ${dateFilter === 'month' ? 'bg-cyan-600 hover:bg-cyan-700' : 'hover:text-black'}`}
                                >
                                    Mês
                                </Button>
                                <Button
                                    variant={dateFilter === 'year' ? 'default' : 'outline'}
                                    onClick={() => setDateFilter('year')}
                                    className={`w-full sm:w-auto ${dateFilter === 'year' ? 'bg-cyan-600 hover:bg-cyan-700' : 'hover:text-black'}`}
                                >
                                    Ano
                                </Button>
                                <Button
                                    variant={dateFilter === 'all' ? 'default' : 'outline'}
                                    onClick={() => setDateFilter('all')}
                                    className={`w-full sm:w-auto ${dateFilter === 'all' ? 'bg-cyan-600 hover:bg-cyan-700' : 'hover:text-black'}`}
                                >
                                    Todas
                                </Button>
                            </div>

                            {/* Search Input and Year Selector */}
                            <div className="flex-1 flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nome do paciente..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 h-10"
                                    />
                                </div>
                                {dateFilter === 'year' && (
                                    <div className="w-24">
                                        <Input
                                            type="number"
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                            className="h-10"
                                            min={2020}
                                            max={2100}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Appointments List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Consultas ({filteredAppointments.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                        ) : filteredAppointments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhuma consulta encontrada
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredAppointments.map((apt) => (
                                    <div key={apt.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            {/* Left: Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">
                                                        {new Date(apt.horario_consulta).toLocaleString('pt-BR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <p className="text-lg font-semibold">{apt.leads?.nome || 'Nome não disponível'}</p>
                                                <p className="text-sm text-muted-foreground">{apt.leads?.telefone || 'Telefone não disponível'}</p>
                                                <div className="mt-2">
                                                    <StatusBadge status={apt.status} />
                                                </div>
                                            </div>

                                            {/* Right: Actions */}
                                            {apt.status === 'AGENDADA' && (
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="hover:text-green-800 gap-2 border-green-200 text-green-700 hover:bg-green-50"
                                                        onClick={() => updateAppointmentStatus(apt.id, 'COMPARECEU')}
                                                        disabled={updatingId === apt.id}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                        Compareceu
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="hover:text-red-800 gap-2 border-red-200 text-red-700 hover:bg-red-50"
                                                        onClick={() => updateAppointmentStatus(apt.id, 'FALTOU')}
                                                        disabled={updatingId === apt.id}
                                                    >
                                                        <X className="h-4 w-4" />
                                                        Faltou
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="hover:text-gray-800 gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                                                        onClick={() => updateAppointmentStatus(apt.id, 'CANCELADO')}
                                                        disabled={updatingId === apt.id}
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                        Cancelado
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
