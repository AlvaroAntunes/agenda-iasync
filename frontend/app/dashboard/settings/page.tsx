"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar, CreditCard, AlertTriangle, XCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Users, Bot, ArrowLeft, Plus, Trash2, CheckCircle2, Edit } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ClinicLoading } from "@/components/ClinicLoading"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { TrialBanner } from "@/components/TrialBanner"
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
import { ClinicHeader } from "@/components/Header"

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
  asaas_id?: string
  subscription_status?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive'
  subscription_interval?: 'monthly' | 'yearly'
  subscription_end_date?: string
}

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SP", "SE", "TO"
]

type Profissional = {
  id: string
  clinic_id: string
  nome: string
  especialidade: string
  genero: 'masculino' | 'feminino'
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
  const [isDeleteProfissionalOpen, setIsDeleteProfissionalOpen] = useState(false)
  const [isCancelSubscriptionOpen, setIsCancelSubscriptionOpen] = useState(false)
  const [editingProfissionalId, setEditingProfissionalId] = useState<string | null>(null)
  const [deletingProfissionalId, setDeletingProfissionalId] = useState<string | null>(null)
  const [profissionalForm, setProfissionalForm] = useState({
    nome: '',
    especialidade: '',
    genero: '' as 'masculino' | 'feminino' | '',
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
        router.push('/')
        return
      }

      const { data: clinic, error: clinicError } = await supabase
        .from('clinicas')
        .select('*')
        .eq('id', profile.clinic_id)
        .single()

      if (clinicError) throw clinicError

      setClinicData(clinic)
      let clinicWithSub = { ...clinic }

      // Buscar assinatura ativa ou mais recente
      const { data: assinaturas } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('data_fim', { ascending: false })
        .limit(1)

      if (assinaturas && assinaturas.length > 0) {
        const assinatura = assinaturas[0]

        let statusMap: any = {
          'ativa': 'active',
          'inativa': 'inactive',
          'cancelada': 'canceled',
          'pendente': 'past_due'
        }

        clinicWithSub = {
          ...clinicWithSub,
          asaas_id: assinatura.asaas_id,
          subscription_status: statusMap[assinatura.status] || 'inactive',
          subscription_interval: assinatura.ciclo === 'mensal' ? 'monthly' : 'yearly',
          subscription_end_date: assinatura.data_fim
        }
      }

      // Remover formatação do telefone se houver
      const clinicDataClean = {
        ...clinicWithSub,
        telefone: clinicWithSub.telefone ? unformatTelefone(clinicWithSub.telefone) : clinicWithSub.telefone
      }

      setClinicData(clinicDataClean)
      setFormData(clinicDataClean)

      // Carregar profissionais da clínica
      await loadProfissionais(profile.clinic_id)
    } catch (error) {
      logger.error('Erro ao carregar dados:', error)
      router.push('/')
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
    if (!clinicData || !profissionalForm.nome || !profissionalForm.especialidade || !profissionalForm.genero) {
      setProfissionalError("Preencha todos os campos obrigatórios")
      return
    }

    setSaving(true)
    setProfissionalError("")
    setProfissionalSuccess("")

    try {
      const { data: newProfissional, error: insertError } = await supabase
        .from('profissionais')
        .insert({
          clinic_id: clinicData.id,
          nome: profissionalForm.nome,
          especialidade: profissionalForm.especialidade,
          genero: profissionalForm.genero,
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
      setProfissionalForm({ nome: '', especialidade: '', genero: '', external_calendar_id: 'primary' })
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
    if (!editingProfissionalId || !profissionalForm.nome || !profissionalForm.especialidade || !profissionalForm.genero) {
      setProfissionalError("Preencha todos os campos obrigatórios")
      return
    }

    setSaving(true)
    setProfissionalError("")
    setProfissionalSuccess("")

    try {
      const { data: updatedProfissional, error: updateError } = await supabase
        .from('profissionais')
        .update({
          nome: profissionalForm.nome,
          especialidade: profissionalForm.especialidade,
          genero: profissionalForm.genero,
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
      setProfissionalForm({ nome: '', especialidade: '', genero: '', external_calendar_id: 'primary' })
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
      genero: (profissional.genero as 'masculino' | 'feminino') || '',
      external_calendar_id: profissional.external_calendar_id
    })
    setIsEditProfissionalOpen(true)
  }

  const openDeleteDialog = (id: string) => {
    setDeletingProfissionalId(id)
    setIsDeleteProfissionalOpen(true)
  }

  const handleDeleteProfissional = async () => {
    if (!deletingProfissionalId) return

    setSaving(true)
    setProfissionalError("")
    setProfissionalSuccess("")

    try {
      const { error: deleteError } = await supabase
        .from('profissionais')
        .delete()
        .eq('id', deletingProfissionalId)

      if (deleteError) throw deleteError

      setProfissionais(profissionais.filter(p => p.id !== deletingProfissionalId))
      setIsDeleteProfissionalOpen(false)
      setDeletingProfissionalId(null)
      setProfissionalSuccess('Profissional removido com sucesso!')

      setTimeout(() => {
        setProfissionalSuccess("")
      }, 3000)
    } catch (error: any) {
      logger.error('Erro ao remover profissional:', error)
      setProfissionalError(error.message || 'Erro ao remover profissional')
    } finally {
      setSaving(false)
    }
  }

  // Função para remover formatação do telefone (apenas números)
  const unformatTelefone = (value: string) => {
    return value.replace(/\D/g, "")
  }

  // Máscara de telefone (apenas para exibição)
  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, "")

    if (numbers.length === 0) return ""
    if (numbers.length <= 2) return `(${numbers}`
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const handleSaveClinic = async () => {
    if (!clinicData) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      // Garantir que o telefone seja salvo apenas com números
      const telefoneClean = formData.telefone ? unformatTelefone(formData.telefone) : (formData.telefone || '')

      const { error: updateError } = await supabase
        .from('clinicas')
        .update({
          nome: formData.nome,
          email: formData.email,
          telefone: telefoneClean,
          endereco: formData.endereco,
          cidade: formData.cidade,
          uf: formData.uf,
          prompt_ia: formData.prompt_ia,
          ia_ativa: formData.ia_ativa,
          tipo_calendario: formData.tipo_calendario,
        })
        .eq('id', clinicData.id)

      if (updateError) throw updateError

      // Atualizar estado com telefone sem formatação
      const updatedData = { ...clinicData, ...formData, telefone: telefoneClean }
      setClinicData(updatedData)
      setFormData(updatedData)
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

  const handleCancelEdit = () => {
    if (clinicData) {
      setFormData(clinicData)
      setSuccess("Alterações descartadas.")
      setTimeout(() => setSuccess(""), 2000)
    }
  }

  const handleCancelSubscription = async () => {
    // Verificações de segurança
    if (!clinicData?.asaas_id || !clinicData?.id) return
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      // 1. Chamada para o seu Backend Python
      const response = await fetch(`${apiUrl}/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // O corpo deve bater com o modelo 'CancelRequest' do Python (snake_case)
        body: JSON.stringify({
          asaas_id: clinicData.asaas_id,
          clinic_id: clinicData.id
        }),
      })

      const data = await response.json()

      // 2. Tratamento de Erros da API
      if (!response.ok) {
        // O backend Python retorna o erro em 'detail' (padrão FastAPI)
        throw new Error(data.detail || 'Falha ao cancelar assinatura no servidor')
      }

      // 3. Sucesso: Atualiza a interface
      setClinicData(prev => prev ? ({ ...prev, subscription_status: 'canceled' }) : null)
      setSuccess(data.message || 'Assinatura cancelada com sucesso.')
      setTimeout(() => setSuccess(""), 2000)
      setIsCancelSubscriptionOpen(false)

    } catch (error: any) {
      logger.error('Erro ao cancelar assinatura:', error)
      setError(error.message || 'Erro ao cancelar assinatura. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return <ClinicLoading />
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 via-white to-blue-50/50 pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(15 23 42) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Header */}
      <ClinicHeader
        clinicName={clinicData?.nome}
        onSignOut={handleSignOut}
      />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {clinicData?.id && (
          <div className="mb-8">
            <TrialBanner clinicId={clinicData.id} blockAccess={false} />
          </div>
        )}

        {/* Success/Error Alerts Flutuantes */}
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none items-center">
          {success && (
            <Alert className="pointer-events-auto w-auto min-w-[300px] border-emerald-200 bg-emerald-50 shadow-lg animate-in slide-in-from-right-10">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-700 font-medium">{success}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert className="pointer-events-auto w-auto min-w-[300px] border-red-200 bg-red-50 shadow-lg animate-in slide-in-from-right-10">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Clinic Information Card */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-white/50 relative overflow-hidden">
          {/* Header do Card */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Informações Gerais</h2>
          </div>

          <div className="grid gap-6 mb-2 md:mb-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-slate-700 font-medium">Nome da Clínica *</Label>
              <Input
                id="nome"
                value={formData.nome || ''}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Clínica Dental São Paulo"
                className="h-12 rounded-xl border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  readOnly
                  title="Para alterar seu email, entre em contato com o suporte"
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed focus:ring-0 focus:border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-slate-700 font-medium">Telefone *</Label>
                <Input
                  id="telefone"
                  value={formatTelefone(formData.telefone || '')}
                  onChange={(e) => {
                    const numbersOnly = unformatTelefone(e.target.value)
                    setFormData({ ...formData, telefone: numbersOnly })
                  }}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  className="h-12 rounded-xl border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="uf" className="text-slate-700 font-medium">UF</Label>
                <select
                  id="uf"
                  value={formData.uf || ''}
                  onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                  className="h-12 cursor-pointer w-full border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white rounded-xl border px-3 text-sm text-slate-500 options:text-slate-700"
                >
                  <option value="" className="cursor-pointer">Selecione</option>
                  {UFS.map((uf) => (
                    <option className="cursor-pointer" key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade" className="text-slate-700 font-medium">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade || ''}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="São Paulo"
                  className="h-12 rounded-xl border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco" className="text-slate-700 font-medium">Endereço</Label>
              <Input
                id="endereco"
                value={formData.endereco || ''}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Rua exemplo, 123"
                className="h-12 rounded-xl border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20"
              />
            </div>

            <div className="flex items-center justify-between p-6 bg-slate-50/80 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <Label htmlFor="ia_ativa" className="text-base font-semibold text-slate-900">
                  Bot de IA
                </Label>
                <p className="text-sm text-slate-500">
                  Ative o agendamento automático via IA para seus pacientes
                </p>
              </div>
              <Switch
                id="ia_ativa"
                checked={formData.ia_ativa ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, ia_ativa: checked })}
                className="cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_calendario" className="text-slate-700 font-medium">Tipo de Calendário</Label>
              <Select
                value={formData.tipo_calendario || 'google'}
                onValueChange={(value: any) => setFormData({ ...formData, tipo_calendario: value })}
              >
                <SelectTrigger className="h-12 rounded-xl border-cyan-200 focus:ring-cyan-400/20 cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="cursor-pointer" value="google">Google Calendar</SelectItem>
                  <SelectItem className="cursor-pointer" value="outlook">Outlook Calendar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seção de Plano Refatorada */}
            <div className="mt-8 pt-8 border-t border-slate-100">
              <Label className="mb-4 text-lg font-bold text-slate-900">Sua Assinatura</Label>

              <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-6 relative overflow-hidden group hover:border-cyan-200 transition-colors duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                      {clinicData?.plano === 'enterprise' ? <Building2 className="h-7 w-7 text-blue-600" /> :
                        clinicData?.plano === 'premium' ? <Bot className="h-7 w-7 text-cyan-600" /> : <Users className="h-7 w-7 text-slate-600" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-xl text-slate-900 capitalize">
                          {clinicData?.plano === 'enterprise' ? 'Plano Enterprise' :
                            clinicData?.plano === 'premium' ? 'Plano Clinic Pro' :
                              clinicData?.plano === 'basic' ? 'Plano Basic' : clinicData?.plano}
                        </h3>
                        {clinicData?.subscription_status === 'active' && (
                          <Badge className="rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200">
                            Ativa
                          </Badge>
                        )}
                        {clinicData?.subscription_status === 'canceled' && (
                          <Badge className="rounded-md px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                            Cancelada
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">
                        {clinicData?.subscription_interval === 'yearly' ? 'Ciclo Anual' : 'Ciclo Mensal'}
                      </p>
                    </div>
                  </div>

                  <div className="text-left md:text-right bg-white/50 p-4 rounded-xl border border-slate-100 w-full md:w-auto">
                    {clinicData?.subscription_end_date ? (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                          {clinicData.subscription_status === 'active' ? (clinicData.subscription_interval === 'yearly' ? 'Vencimento em' : 'Renovação automática em') : 'Acesso atual expira em'}
                        </p>
                        <div className="flex items-center gap-2 text-slate-900 font-medium">
                          <Calendar className="h-4 w-4 text-cyan-600" />
                          {new Date(clinicData.subscription_end_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-sm">Sem data de renovação</div>
                    )}
                  </div>

                </div>
              </div>
            </div>

          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <Label className="text-lg font-bold text-slate-900"></Label>
            {clinicData?.subscription_status === 'active' && (
              <Dialog open={isCancelSubscriptionOpen} onOpenChange={setIsCancelSubscriptionOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-8 px-3 py-1 text-xs border border-slate-200 bg-white text-red-400 hover:text-red-500 hover:bg-slate-100 shadow-none font-normal rounded-md"
                  >
                    Cancelar Assinatura
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Cancelar Assinatura
                    </DialogTitle>
                    <DialogDescription className="pt-2 text-slate-600">
                      Ao cancelar, você perderá acesso aos recursos premium em <strong>{clinicData.subscription_end_date ? new Date(clinicData.subscription_end_date).toLocaleDateString('pt-BR') : 'breve'}</strong>. Tem certeza?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" className="rounded-xl border-slate-200 hover:text-green-900" onClick={() => setIsCancelSubscriptionOpen(false)}>Manter Plano</Button>
                    <Button onClick={handleCancelSubscription} disabled={saving} className="mx-4 rounded-xl bg-red-600 hover:bg-red-700">
                      {saving ? 'Cancelando...' : 'Sim, cancelar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="flex justify-end pt-6 mt-6 border-t border-slate-100 gap-3">
            <Button
              onClick={handleCancelEdit}
              disabled={saving}
              className="h-12 px-6 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-500 transition-colors"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveClinic}
              disabled={saving}
              className="h-12 px-8 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20 font-semibold transition-all hover:scale-[1.02]"
            >
              {saving ? 'Salvando Alterações...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>

        {/* Doctors Management Card */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-white/50">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Profissionais</h2>
                <p className="text-slate-500 text-sm hidden sm:block">Gerencie a equipe da clínica</p>
              </div>
            </div>
            <Dialog open={isAddProfissionalOpen} onOpenChange={setIsAddProfissionalOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20 font-semibold transition-all hover:scale-[1.02]">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Adicionar</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              {/* Dialog Content mantido similar mas com classes de rounded atualizadas */}
              <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar Profissional</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do novo profissional.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="prof-nome">Nome *</Label>
                    <Input
                      id="prof-nome"
                      value={profissionalForm.nome}
                      onChange={(e) => setProfissionalForm({ ...profissionalForm, nome: e.target.value })}
                      placeholder="João Silva"
                      className="rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="prof-especialidade">Especialidade *</Label>
                    <Input
                      id="prof-especialidade"
                      value={profissionalForm.especialidade}
                      onChange={(e) => setProfissionalForm({ ...profissionalForm, especialidade: e.target.value })}
                      placeholder="Dentista Geral"
                      className="rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="prof-genero">Gênero *</Label>
                    <Select
                      value={profissionalForm.genero}
                      onValueChange={(value) => setProfissionalForm({ ...profissionalForm, genero: value as 'masculino' | 'feminino' })}
                    >
                      <SelectTrigger id="prof-genero" className="rounded-xl border-slate-200">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="prof-calendar">ID do Calendário</Label>
                    <Input
                      id="prof-calendar"
                      value={profissionalForm.external_calendar_id}
                      onChange={(e) => setProfissionalForm({ ...profissionalForm, external_calendar_id: e.target.value })}
                      placeholder="primary"
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={() => setIsAddProfissionalOpen(false)} disabled={saving} className="rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-500 transition-colors">
                    Cancelar
                  </Button>
                  <Button onClick={handleAddProfissional} disabled={saving || !profissionalForm.nome} className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20 font-semibold transition-all">
                    {saving ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Alerts de Profissionais */}
          {profissionalSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">{profissionalSuccess}</span>
            </div>
          )}
          {profissionalError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-700 font-medium">{profissionalError}</span>
            </div>
          )}

          <div className="grid gap-4">
            {profissionais.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">Nenhum profissional cadastrado</p>
                <p className="text-slate-400 text-sm mt-1">Adicione profissionais para gerenciar suas agendas</p>
              </div>
            ) : (
              profissionais.map((profissional) => (
                <div key={profissional.id} className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-cyan-200 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-700 flex-shrink-0 font-bold border border-cyan-100">
                      {profissional.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">{profissional.nome}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        {profissional.especialidade && (
                          <span className="truncate">{profissional.especialidade}</span>
                        )}
                        {profissional.especialidade && <span className="text-slate-300">•</span>}
                        <span className="truncate text-xs bg-slate-100 px-2 py-0.5 rounded-md">Cal: {profissional.external_calendar_id}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(profissional)}
                      className="hover:bg-slate-100 rounded-lg text-slate-500 hover:text-cyan-700"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"
                      onClick={() => openDeleteDialog(profissional.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dialog de Editar Profissional (Mantendo estrutura, apenas ajustando estilos) */}
        <Dialog open={isEditProfissionalOpen} onOpenChange={setIsEditProfissionalOpen}>
          <DialogContent className="rounded-2xl">
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
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-prof-especialidade">Especialidade *</Label>
                <Input
                  id="edit-prof-especialidade"
                  value={profissionalForm.especialidade}
                  onChange={(e) => setProfissionalForm({ ...profissionalForm, especialidade: e.target.value })}
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-prof-genero">Gênero *</Label>
                <Select
                  value={profissionalForm.genero}
                  onValueChange={(value) => setProfissionalForm({ ...profissionalForm, genero: value as 'masculino' | 'feminino' })}
                >
                  <SelectTrigger id="edit-prof-genero" className="rounded-xl border-slate-200">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-prof-calendar">ID do Calendário</Label>
                <Input
                  id="edit-prof-calendar"
                  value={profissionalForm.external_calendar_id}
                  onChange={(e) => setProfissionalForm({ ...profissionalForm, external_calendar_id: e.target.value })}
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  setIsEditProfissionalOpen(false)
                  setEditingProfissionalId(null)
                  setProfissionalForm({ nome: '', especialidade: '', genero: '', external_calendar_id: 'primary' })
                }}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-500 transition-colors"
              >
                Cancelar
              </Button>
              <Button onClick={handleEditProfissional} disabled={saving || !profissionalForm.nome} className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20 font-semibold transition-all">
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Excluir Profissional */}
        <Dialog open={isDeleteProfissionalOpen} onOpenChange={setIsDeleteProfissionalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Excluir Profissional
              </DialogTitle>
              <DialogDescription className="pt-2 text-slate-600">
                Tem certeza que deseja remover este profissional? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                onClick={() => {
                  setIsDeleteProfissionalOpen(false)
                  setDeletingProfissionalId(null)
                }}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-500 transition-colors"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteProfissional}
                disabled={saving}
                className="mx-4 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 font-semibold transition-all"
              >
                {saving ? 'Excluindo...' : 'Sim, excluir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  )
}

