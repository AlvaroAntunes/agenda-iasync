"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Users, Bot, ArrowLeft, Plus, Trash2, CheckCircle2, Edit } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { useSubscriptionCheck } from "@/lib/use-subscription-check"
import { logger } from '@/lib/logger'

type ClinicData = {
  id: string
  nome: string
  email: string
  telefone: string
  endereco: string | null
  cidade: string | null
  uf: string | null
  tipo_calendario: 'google' | 'outlook'
  prompt_ia: string | null
  plano: 'basic' | 'premium' | 'enterprise'
  ia_ativa: boolean
}

type Profissional = {
  id: string
  clinic_id: string
  nome: string
  especialidade: string | null
  external_calendar_id: string
  created_at: string
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  useSubscriptionCheck() // Verificar status da assinatura automaticamente
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [profissionalSuccess, setProfissionalSuccess] = useState("")
  const [profissionalError, setProfissionalError] = useState("")
  const [clinicData, setClinicData] = useState<ClinicData | null>(null)
  const [formData, setFormData] = useState<Partial<ClinicData>>({})
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [isAddProfissionalOpen, setIsAddProfissionalOpen] = useState(false)
  const [isEditProfissionalOpen, setIsEditProfissionalOpen] = useState(false)
  const [editingProfissionalId, setEditingProfissionalId] = useState<string | null>(null)
  const [profissionalForm, setProfissionalForm] = useState({
    nome: '',
    especialidade: '',
    external_calendar_id: 'primary'
  })

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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('clinic_id, role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || profile.role !== 'clinic_admin') {
        router.push('/login/clinic')
        return
      }

      const { data: clinic, error: clinicError } = await supabase
        .from('clinicas')
        .select('*')
        .eq('id', profile.clinic_id)
        .single()

      if (clinicError) throw clinicError

      setClinicData(clinic)
      setFormData(clinic)
      
      // Carregar profissionais da clínica
      await loadProfissionais(profile.clinic_id)
    } catch (error) {
      logger.error('Erro ao carregar dados:', error)
      router.push('/login/clinic')
    } finally {
      setLoading(false)
    }
  }

  const loadProfissionais = async (clinicId: string) => {
    try {
      const { data: profissionaisData, error: profissionaisError } = await supabase
        .from('profissionais')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('nome', { ascending: true })

      if (profissionaisError) throw profissionaisError

      setProfissionais(profissionaisData || [])
    } catch (error) {
      logger.error('Erro ao carregar profissionais:', error)
    }
  }

  const handleAddProfissional = async () => {
    if (!clinicData || !profissionalForm.nome) return

    setSaving(true)
    setProfissionalError("")
    setProfissionalSuccess("")

    try {
      const { data: newProfissional, error: insertError } = await supabase
        .from('profissionais')
        .insert({
          clinic_id: clinicData.id,
          nome: profissionalForm.nome,
          especialidade: profissionalForm.especialidade || null,
          external_calendar_id: profissionalForm.external_calendar_id
        })
        .select()
        .single()

      if (insertError) {
        logger.error('Erro detalhado do Supabase:', insertError)
        throw new Error(insertError.message || 'Erro ao inserir profissional no banco de dados')
      }

      if (!newProfissional) {
        throw new Error('Nenhum dado retornado após inserção')
      }

      setProfissionais([...profissionais, newProfissional])
      setIsAddProfissionalOpen(false)
      setProfissionalForm({ nome: '', especialidade: '', external_calendar_id: 'primary' })
      setProfissionalSuccess('Profissional adicionado com sucesso!')
      
      setTimeout(() => {
        setProfissionalSuccess("")
      }, 3000)
    } catch (error: any) {
      logger.error('Erro ao adicionar profissional:', error)
      logger.error('Detalhes do erro:', JSON.stringify(error, null, 2))
      const errorMessage = error?.message || error?.error_description || error?.hint || 'Erro desconhecido ao adicionar profissional'
      setProfissionalError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleEditProfissional = async () => {
    if (!editingProfissionalId || !profissionalForm.nome) return

    setSaving(true)
    setProfissionalError("")
    setProfissionalSuccess("")

    try {
      const { data: updatedProfissional, error: updateError } = await supabase
        .from('profissionais')
        .update({
          nome: profissionalForm.nome,
          especialidade: profissionalForm.especialidade || null,
          external_calendar_id: profissionalForm.external_calendar_id
        })
        .eq('id', editingProfissionalId)
        .select()
        .single()

      if (updateError) {
        logger.error('Erro detalhado do Supabase:', updateError)
        throw new Error(updateError.message || 'Erro ao atualizar profissional no banco de dados')
      }

      if (!updatedProfissional) {
        throw new Error('Nenhum dado retornado após atualização')
      }

      setProfissionais(profissionais.map(p => 
        p.id === editingProfissionalId ? updatedProfissional : p
      ))
      setIsEditProfissionalOpen(false)
      setEditingProfissionalId(null)
      setProfissionalForm({ nome: '', especialidade: '', external_calendar_id: 'primary' })
      setProfissionalSuccess('Profissional atualizado com sucesso!')
      
      setTimeout(() => {
        setProfissionalSuccess("")
      }, 3000)
    } catch (error: any) {
      logger.error('Erro ao atualizar profissional:', error)
      logger.error('Detalhes do erro:', JSON.stringify(error, null, 2))
      const errorMessage = error?.message || error?.error_description || error?.hint || 'Erro desconhecido ao atualizar profissional'
      setProfissionalError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const openEditDialog = (profissional: Profissional) => {
    setEditingProfissionalId(profissional.id)
    setProfissionalForm({
      nome: profissional.nome,
      especialidade: profissional.especialidade || '',
      external_calendar_id: profissional.external_calendar_id
    })
    setIsEditProfissionalOpen(true)
  }

  const handleDeleteProfissional = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este profissional?')) return

    try {
      const { error: deleteError } = await supabase
        .from('profissionais')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setProfissionais(profissionais.filter(p => p.id !== id))
      setProfissionalSuccess('Profissional removido com sucesso!')
      
      setTimeout(() => {
        setProfissionalSuccess("")
      }, 3000)
    } catch (error: any) {
      logger.error('Erro ao remover profissional:', error)
      setProfissionalError(error.message || 'Erro ao remover profissional')
    }
  }

  const handleSaveClinic = async () => {
    if (!clinicData) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const { error: updateError } = await supabase
        .from('clinicas')
        .update({
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
          endereco: formData.endereco,
          cidade: formData.cidade,
          uf: formData.uf,
          prompt_ia: formData.prompt_ia,
          ia_ativa: formData.ia_ativa,
          tipo_calendario: formData.tipo_calendario,
        })
        .eq('id', clinicData.id)

      if (updateError) throw updateError

      setClinicData({ ...clinicData, ...formData })
      setSuccess('Dados atualizados com sucesso!')
      
      setTimeout(() => {
        setSuccess("")
      }, 3000)
    } catch (error: any) {
      logger.error('Erro ao salvar:', error)
      setError(error.message || 'Erro ao salvar alterações')
    } finally {
      setSaving(false)
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="w-full px-4 md:px-8 lg:px-8 py-4">
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
            <Button variant="outline" onClick={handleSignOut}>Sair</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Success/Error Alerts */}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-600">{error}</AlertDescription>
          </Alert>
        )}

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
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Clínica *</Label>
                  <Input
                    id="nome"
                    value={formData.nome || ''}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Clínica Dental São Paulo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contato@clinica.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone || ''}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco || ''}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua exemplo, 123"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade || ''}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      placeholder="São Paulo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uf">UF</Label>
                    <Input
                      id="uf"
                      value={formData.uf || ''}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="ia_ativa" className="text-base">
                      IA Ativa
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar ou desativar o bot de IA para esta clínica
                    </p>
                  </div>
                  <Switch
                    id="ia_ativa"
                    checked={formData.ia_ativa ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, ia_ativa: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_calendario">Tipo de Calendário</Label>
                  <Select 
                    value={formData.tipo_calendario || 'google'} 
                    onValueChange={(value: any) => setFormData({ ...formData, tipo_calendario: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Calendar</SelectItem>
                      <SelectItem value="outlook">Outlook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Plano Atual</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      clinicData?.plano === 'enterprise' ? 'default' :
                      clinicData?.plano === 'premium' ? 'secondary' : 'outline'
                    }>
                      {clinicData?.plano}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      (Entre em contato para alterar o plano)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveClinic} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
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
                    Profissionais
                  </CardTitle>
                  <CardDescription>Gerencie os profissionais da clínica</CardDescription>
                </div>
                <Dialog open={isAddProfissionalOpen} onOpenChange={setIsAddProfissionalOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar Profissional
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Profissional</DialogTitle>
                      <DialogDescription>
                        Adicione um novo profissional à clínica
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="prof-nome">Nome *</Label>
                        <Input
                          id="prof-nome"
                          value={profissionalForm.nome}
                          onChange={(e) => setProfissionalForm({ ...profissionalForm, nome: e.target.value })}
                          placeholder="Dr. João Silva"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="prof-especialidade">Especialidade</Label>
                        <Input
                          id="prof-especialidade"
                          value={profissionalForm.especialidade}
                          onChange={(e) => setProfissionalForm({ ...profissionalForm, especialidade: e.target.value })}
                          placeholder="Dentista Geral"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="prof-calendar">ID do Calendário</Label>
                        <Input
                          id="prof-calendar"
                          value={profissionalForm.external_calendar_id}
                          onChange={(e) => setProfissionalForm({ ...profissionalForm, external_calendar_id: e.target.value })}
                          placeholder="primary"
                        />
                        <p className="text-xs text-muted-foreground">
                          ID do calendário externo (Google Calendar, etc.)
                        </p>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddProfissionalOpen(false)} disabled={saving}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddProfissional} disabled={saving || !profissionalForm.nome}>
                        {saving ? 'Adicionando...' : 'Adicionar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Success/Error Alerts para Profissionais */}
              {profissionalSuccess && (
                <Alert className="mb-4 border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">{profissionalSuccess}</AlertDescription>
                </Alert>
              )}
              {profissionalError && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-600">{profissionalError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {profissionais.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">Nenhum profissional cadastrado</p>
                  </div>
                ) : (
                  profissionais.map((profissional) => (
                    <div key={profissional.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{profissional.nome}</p>
                          {profissional.especialidade && (
                            <p className="text-sm text-muted-foreground truncate">{profissional.especialidade}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            Calendário: {profissional.external_calendar_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(profissional)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => handleDeleteProfissional(profissional.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dialog de Editar Profissional */}
          <Dialog open={isEditProfissionalOpen} onOpenChange={setIsEditProfissionalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Profissional</DialogTitle>
                <DialogDescription>
                  Atualize as informações do profissional
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-prof-nome">Nome *</Label>
                  <Input
                    id="edit-prof-nome"
                    value={profissionalForm.nome}
                    onChange={(e) => setProfissionalForm({ ...profissionalForm, nome: e.target.value })}
                    placeholder="Dr. João Silva"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-prof-especialidade">Especialidade</Label>
                  <Input
                    id="edit-prof-especialidade"
                    value={profissionalForm.especialidade}
                    onChange={(e) => setProfissionalForm({ ...profissionalForm, especialidade: e.target.value })}
                    placeholder="Dentista Geral"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-prof-calendar">ID do Calendário</Label>
                  <Input
                    id="edit-prof-calendar"
                    value={profissionalForm.external_calendar_id}
                    onChange={(e) => setProfissionalForm({ ...profissionalForm, external_calendar_id: e.target.value })}
                    placeholder="primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    ID do calendário externo (Google Calendar, etc.)
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditProfissionalOpen(false)
                    setEditingProfissionalId(null)
                    setProfissionalForm({ nome: '', especialidade: '', external_calendar_id: 'primary' })
                  }} 
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button onClick={handleEditProfissional} disabled={saving || !profissionalForm.nome}>
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </main>
    </div>
  )
}
