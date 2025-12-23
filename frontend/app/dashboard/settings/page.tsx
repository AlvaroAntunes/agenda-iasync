"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Users, Bot, ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

// Mock data
const mockDoctors = [
  { id: 1, name: "Dr. João Santos", specialty: "Dentista Geral", email: "joao@clinica.com.br" },
  { id: 2, name: "Dra. Ana Costa", specialty: "Ortodontista", email: "ana@clinica.com.br" },
  { id: 3, name: "Dra. Paula Mendes", specialty: "Endodontista", email: "paula@clinica.com.br" },
]

export default function SettingsPage() {
  const [clinicInfo, setClinicInfo] = useState({
    name: "Clínica Dental São Paulo",
    email: "contato@clinicasp.com.br",
    phone: "(11) 98765-4321",
    address: "Rua das Flores, 123 - São Paulo, SP",
  })

  const [botConfig, setBotConfig] = useState({
    greeting: "Olá! Bem-vindo à Clínica Dental São Paulo. Como posso ajudá-lo hoje?",
    phoneNumber: "+55 11 98765-4321",
    status: "connected",
  })

  const [doctors, setDoctors] = useState(mockDoctors)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <Building2 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
                  <p className="text-sm text-muted-foreground">Gerencie sua clínica</p>
                </div>
              </div>
            </div>
            <Button variant="outline">Sair</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="space-y-6">
          {/* Clinic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações da Clínica
              </CardTitle>
              <CardDescription>Dados gerais da sua clínica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clinic-name">Nome da Clínica</Label>
                  <Input
                    id="clinic-name"
                    value={clinicInfo.name}
                    onChange={(e) => setClinicInfo({ ...clinicInfo, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-email">Email</Label>
                  <Input
                    id="clinic-email"
                    type="email"
                    value={clinicInfo.email}
                    onChange={(e) => setClinicInfo({ ...clinicInfo, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clinic-phone">Telefone</Label>
                  <Input
                    id="clinic-phone"
                    value={clinicInfo.phone}
                    onChange={(e) => setClinicInfo({ ...clinicInfo, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-address">Endereço</Label>
                  <Input
                    id="clinic-address"
                    value={clinicInfo.address}
                    onChange={(e) => setClinicInfo({ ...clinicInfo, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button>Salvar Alterações</Button>
              </div>
            </CardContent>
          </Card>

          {/* Doctors Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Médicos e Equipe
                  </CardTitle>
                  <CardDescription>Gerencie os profissionais da clínica</CardDescription>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Médico
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{doctor.name}</p>
                        <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                        <p className="text-xs text-muted-foreground">{doctor.email}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Bot Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Configuração do Bot WhatsApp
              </CardTitle>
              <CardDescription>Configure as mensagens automáticas do seu bot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/50">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Status da Conexão</p>
                    <p className="text-xs text-muted-foreground">{botConfig.phoneNumber}</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Conectado</Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bot-greeting">Mensagem de Boas-vindas</Label>
                <Textarea
                  id="bot-greeting"
                  rows={4}
                  value={botConfig.greeting}
                  onChange={(e) => setBotConfig({ ...botConfig, greeting: e.target.value })}
                  placeholder="Digite a mensagem que o bot enviará ao iniciar uma conversa..."
                />
                <p className="text-xs text-muted-foreground">
                  Esta mensagem será enviada automaticamente quando um paciente iniciar uma conversa.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bot-phone">Número do WhatsApp</Label>
                <Input
                  id="bot-phone"
                  value={botConfig.phoneNumber}
                  onChange={(e) => setBotConfig({ ...botConfig, phoneNumber: e.target.value })}
                  placeholder="+55 11 98765-4321"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline">Desconectar Bot</Button>
                <Button>Salvar Configurações</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
