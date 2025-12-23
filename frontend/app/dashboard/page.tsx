"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, User, Phone, Bot, Settings, Building2, ChevronRight } from "lucide-react"
import Link from "next/link"

// Mock data - will be replaced with real database queries
const mockAppointments = [
  {
    id: 1,
    patientName: "Maria Silva",
    patientPhone: "(11) 98765-4321",
    doctor: "Dr. João Santos",
    date: "2025-01-15",
    time: "14:00",
    type: "Limpeza",
    status: "confirmed",
  },
  {
    id: 2,
    patientName: "Carlos Oliveira",
    patientPhone: "(11) 97654-3210",
    doctor: "Dra. Ana Costa",
    date: "2025-01-15",
    time: "15:00",
    type: "Consulta",
    status: "pending",
  },
  {
    id: 3,
    patientName: "Fernanda Lima",
    patientPhone: "(11) 96543-2109",
    doctor: "Dr. João Santos",
    date: "2025-01-15",
    time: "16:00",
    type: "Ortodontia",
    status: "confirmed",
  },
  {
    id: 4,
    patientName: "Roberto Alves",
    patientPhone: "(11) 95432-1098",
    doctor: "Dra. Paula Mendes",
    date: "2025-01-16",
    time: "09:00",
    type: "Extração",
    status: "confirmed",
  },
  {
    id: 5,
    patientName: "Juliana Souza",
    patientPhone: "(11) 94321-0987",
    doctor: "Dr. João Santos",
    date: "2025-01-16",
    time: "10:30",
    type: "Clareamento",
    status: "pending",
  },
]

const todayAppointments = mockAppointments.filter((apt) => apt.date === "2025-01-15")
const upcomingAppointments = mockAppointments.filter((apt) => apt.date > "2025-01-15")

export default function ClinicDashboard() {
  const [selectedDate, setSelectedDate] = useState("2025-01-15")

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
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Clínica Dental São Paulo</h1>
                <p className="text-sm text-muted-foreground">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/settings">
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline">Sair</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
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
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-foreground">Conectado</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Última sincronização: agora</p>
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
                  <Button variant="outline" size="sm">
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
                              <h3 className="font-semibold text-foreground">{appointment.patientName}</h3>
                              {getStatusBadge(appointment.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {appointment.time}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {appointment.doctor}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {appointment.patientPhone}
                              </span>
                            </div>
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">
                                {appointment.type}
                              </Badge>
                            </div>
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
                        <p className="font-medium text-sm text-foreground">{appointment.patientName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{appointment.doctor}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(appointment.date).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{appointment.time}</span>
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
