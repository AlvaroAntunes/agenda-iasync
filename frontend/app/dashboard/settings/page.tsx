"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, CreditCard, AlertTriangle, XCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Users, Bot, ArrowLeft, Plus, Trash2, CheckCircle2, Edit, Maximize2, Minimize2 } from "lucide-react"
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
  plano: 'consultorio' | 'clinica_pro' | 'corporate' | 'trial'
  ia_ativa: boolean
  asaas_id?: string
  subscription_status?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive'
  subscription_interval?: 'monthly' | 'yearly'
  subscription_end_date?: string
  plan_id?: string
  clinica_fechada?: Array<{ date: string, description: string }> | string[] | null
  horario_funcionamento?: Array<{
    dia: string
    ativo: boolean
    abertura: string
    fechamento: string
  }> | null
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
  const searchParams = useSearchParams()
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
  const [isRenewSubscriptionOpen, setIsRenewSubscriptionOpen] = useState(false)
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false)
  const [editingProfissionalId, setEditingProfissionalId] = useState<string | null>(null)
  const [deletingProfissionalId, setDeletingProfissionalId] = useState<string | null>(null)
  const [profissionalForm, setProfissionalForm] = useState({
    nome: '',
    especialidade: '',
    genero: '' as 'masculino' | 'feminino' | '',
    external_calendar_id: 'primary'
  })
  const [calendars, setCalendars] = useState<{ id: string, summary: string }[]>([])
  const [pendingSwitchDate, setPendingSwitchDate] = useState<string | null>(null)
  const [pendingPlanName, setPendingPlanName] = useState<string | null>(null)
  const [isPromptExpanded, setIsPromptExpanded] = useState(false)
  const [closedDays, setClosedDays] = useState<Array<{ date: string, description: string }>>([])
  const [newClosedDay, setNewClosedDay] = useState('')
  const [newClosedDayDescription, setNewClosedDayDescription] = useState('')
  const [savingClosedDay, setSavingClosedDay] = useState(false)
  const [isDeleteClosedDayOpen, setIsDeleteClosedDayOpen] = useState(false)
  const [deletingClosedDay, setDeletingClosedDay] = useState<{ date: string, description: string } | null>(null)
  const [isEditClosedDayOpen, setIsEditClosedDayOpen] = useState(false)
  const [editingClosedDay, setEditingClosedDay] = useState<{ date: string, description: string } | null>(null)
  const [editClosedDayDate, setEditClosedDayDate] = useState('')
  const [editClosedDayDescription, setEditClosedDayDescription] = useState('')

  const [horarioFuncionamento, setHorarioFuncionamento] = useState<any[]>([])

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


      // --- SYNC SUBSCRIPTION (DELAYED DOWNGRADE) ---
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL
        const syncRes = await fetch(`${apiUrl}/subscriptions/sync/${profile.clinic_id}`, { method: 'POST' })
        const syncData = await syncRes.json()

        if (syncData.status === 'waiting' && syncData.switch_date) {
          setPendingSwitchDate(new Date(syncData.switch_date).toLocaleDateString('pt-BR'))
          if (syncData.new_plan_name) setPendingPlanName(syncData.new_plan_name)
        }
      } catch (e) {
        logger.error("Sync error", e)
      }

      const { data: clinic, error: clinicError } = await supabase
        .from('clinicas')
        .select('*')
        .eq('id', profile.clinic_id)
        .single()

      if (clinicError) throw clinicError

      setClinicData(clinic)
      let clinicWithSub = { ...clinic }

      // Buscar assinatura ativa ou mais recente com plano
      const { data: assinaturas } = await supabase
        .from('assinaturas')
        .select('*, planos(nome)')
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
          subscription_end_date: assinatura.data_fim,
          plan_id: assinatura.planos?.nome || assinatura.plan_id,
          plano: (assinatura.planos?.nome || assinatura.plan_id) as any // Atualiza o plano visual com o da assinatura real
        }
      }

      // Remover formatação do telefone se houver
      const clinicDataClean = {
        ...clinicWithSub,
        telefone: clinicWithSub.telefone ? unformatTelefone(clinicWithSub.telefone) : clinicWithSub.telefone
      }

      setClinicData(clinicDataClean)
      setFormData(clinicDataClean)

      // Carregar dias fechados (normalizar para novo formato)
      if (clinicDataClean.clinica_fechada) {
        const normalized = clinicDataClean.clinica_fechada.map((item: string | { date: string, description: string }) => {
          if (typeof item === 'string') {
            // Formato antigo: apenas string
            return { date: item, description: '' }
          }
          // Formato novo: objeto com date e description
          return item
        })
        setClosedDays(normalized)
      }

      // Initialize operating hours if available
      if (clinicDataClean.horario_funcionamento) {
        setHorarioFuncionamento(clinicDataClean.horario_funcionamento)
      } else {
        setHorarioFuncionamento([])
      }

      // Carregar profissionais da clínica
      await loadProfissionais(profile.clinic_id)

      // Carregar calendários disponíveis
      await fetchCalendars(profile.clinic_id)

    } catch (error) {
      logger.error('Erro ao carregar dados:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  // Scroll to section on load if param exists
  useEffect(() => {
    if (!loading) {
      const scrollTo = searchParams.get('scrollTo')
      if (scrollTo === 'profissionais') {
        // Delay to ensure rendering
        setTimeout(() => {
          const element = document.getElementById('profissionais-section')
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      }
    }
  }, [searchParams, loading])

  const fetchCalendars = async (clinicId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const response = await fetch(`${apiUrl}/calendars/list/${clinicId}`)

      if (response.ok) {
        const data = await response.json()
        setCalendars(data.calendars || [])
      }
    } catch (error) {
      logger.error("Erro ao buscar calendários:", error)
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

      // Atualizar o prompt com o horário de funcionamento
      let currentPrompt = formData.prompt_ia ?? clinicData.prompt_ia ?? ''

      if (horarioFuncionamento && horarioFuncionamento.length > 0) {
        const activeHours = horarioFuncionamento.filter((h: any) => h.ativo)

        if (activeHours.length > 0) {
          const hoursString = activeHours
            .map((h: any) => `${h.dia}: ${h.abertura} às ${h.fechamento}`)
            .join('; ') + '.'

          const pattern = /- \*\*Horário de Funcionamento:\*\* .*/
          if (pattern.test(currentPrompt)) {
            currentPrompt = currentPrompt.replace(pattern, `- **Horário de Funcionamento:** ${hoursString}`)
          }
        }
      }

      const { error: updateError } = await supabase
        .from('clinicas')
        .update({
          nome: formData.nome,
          email: formData.email,
          telefone: telefoneClean,
          endereco: formData.endereco,
          cidade: formData.cidade,
          uf: formData.uf,
          prompt_ia: currentPrompt,
          ia_ativa: formData.ia_ativa,
          tipo_calendario: formData.tipo_calendario,
          ...(clinicData.horario_funcionamento ? { horario_funcionamento: horarioFuncionamento } : {}),
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

  const handleAddClosedDay = async () => {
    if (!newClosedDay || !clinicData) return

    setSavingClosedDay(true)
    setError('')
    setSuccess('')

    try {
      // Validate date format
      const dateObj = new Date(newClosedDay)
      if (isNaN(dateObj.getTime())) {
        setError('Data inválida')
        return
      }

      // Check if already exists
      if (closedDays.some(item => item.date === newClosedDay)) {
        setError('Esta data já está na lista')
        return
      }

      // Create new entry
      const newEntry = {
        date: newClosedDay,
        description: newClosedDayDescription
      }

      // Add to list and sort by date
      const updatedDays = [...closedDays, newEntry].sort((a, b) =>
        a.date.localeCompare(b.date)
      )

      // Update Supabase
      const { error: updateError } = await supabase
        .from('clinicas')
        .update({ clinica_fechada: updatedDays })
        .eq('id', clinicData.id)

      if (updateError) throw updateError

      setClosedDays(updatedDays)
      setNewClosedDay('')
      setNewClosedDayDescription('')
      setSuccess('Dia fechado adicionado com sucesso')

      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      logger.error('Erro ao adicionar dia fechado:', error)
      setError('Erro ao adicionar dia fechado')
    } finally {
      setSavingClosedDay(false)
    }
  }

  const handleRemoveClosedDay = (item: { date: string, description: string }) => {
    setDeletingClosedDay(item)
    setIsDeleteClosedDayOpen(true)
  }

  const confirmRemoveClosedDay = async () => {
    if (!clinicData || !deletingClosedDay) return

    setSavingClosedDay(true)
    setError('')
    setSuccess('')

    try {
      const updatedDays = closedDays.filter(item => item.date !== deletingClosedDay.date)

      const { error: updateError } = await supabase
        .from('clinicas')
        .update({ clinica_fechada: updatedDays.length > 0 ? updatedDays : null })
        .eq('id', clinicData.id)

      if (updateError) throw updateError

      setClosedDays(updatedDays)
      setSuccess('Dia fechado removido com sucesso')
      setIsDeleteClosedDayOpen(false)
      setDeletingClosedDay(null)

      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      logger.error('Erro ao remover dia fechado:', error)
      setError('Erro ao remover dia fechado')
    } finally {
      setSavingClosedDay(false)
    }
  }

  const handleEditClosedDay = (item: { date: string, description: string }) => {
    setEditingClosedDay(item)
    setEditClosedDayDate(item.date)
    setEditClosedDayDescription(item.description)
    setIsEditClosedDayOpen(true)
  }

  const confirmEditClosedDay = async () => {
    if (!clinicData || !editingClosedDay) return

    setSavingClosedDay(true)
    setError('')
    setSuccess('')

    try {
      // Validate date format
      const dateObj = new Date(editClosedDayDate)
      if (isNaN(dateObj.getTime())) {
        setError('Data inválida')
        return
      }

      // Check if new date already exists (but not the same item being edited)
      if (editClosedDayDate !== editingClosedDay.date &&
        closedDays.some(item => item.date === editClosedDayDate)) {
        setError('Esta data já está na lista')
        return
      }

      // Update the item
      const updatedDays = closedDays.map(item =>
        item.date === editingClosedDay.date
          ? { date: editClosedDayDate, description: editClosedDayDescription }
          : item
      ).sort((a, b) => a.date.localeCompare(b.date))

      const { error: updateError } = await supabase
        .from('clinicas')
        .update({ clinica_fechada: updatedDays })
        .eq('id', clinicData.id)

      if (updateError) throw updateError

      setClosedDays(updatedDays)
      setSuccess('Dia fechado atualizado com sucesso')
      setIsEditClosedDayOpen(false)
      setEditingClosedDay(null)
      setEditClosedDayDate('')
      setEditClosedDayDescription('')

      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      logger.error('Erro ao atualizar dia fechado:', error)
      setError('Erro ao atualizar dia fechado')
    } finally {
      setSavingClosedDay(false)
    }
  }

  const handleCancelEdit = () => {
    if (clinicData) {
      setFormData(clinicData)
      setSuccess("Alterações descartadas.")
      setTimeout(() => setSuccess(""), 2000)
    }
  }

  const handleRenewSamePlan = async () => {
    if (!clinicData?.id || !clinicData?.plan_id) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL

      const response = await fetch(`${apiUrl}/checkout/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: clinicData.plan_id,
          periodo: 'anual',
          clinic_id: clinicData.id,
          parcelas_cartao: 1
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Erro ao gerar pagamento")
      }

      if (data.url) {
        window.open(data.url, '_blank')
        setIsRenewSubscriptionOpen(false)
        setSuccess('Link de pagamento aberto em nova aba!')
        setTimeout(() => setSuccess(""), 3000)
      }
    } catch (error: any) {
      logger.error('Erro ao renovar assinatura:', error)
      setError(error.message || 'Erro ao iniciar renovação. Tente novamente.')
    } finally {
      setSaving(false)
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

  type PlanType = 'consultorio' | 'clinica_pro' | 'corporate'

  const getPlanLabel = (plan?: string) => {
    const labels: Record<PlanType, string> = {
      consultorio: 'Consultório',
      clinica_pro: 'Clínica Pro',
      corporate: 'Corporate',
    }

    return plan && plan in labels
      ? labels[plan as PlanType]
      : labels.consultorio
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

            {/* Seção de Prompt do Agente */}
            {clinicData?.prompt_ia && (
              <div className="space-y-6 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <Label htmlFor="prompt_ia" className="text-base font-semibold text-slate-900">Instruções do Agente IA</Label>
                    <p className="text-sm text-slate-500">Defina a personalidade e as regras de negócio do seu agente.</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                    className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                  >
                    {isPromptExpanded ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
                    {isPromptExpanded ? 'Reduzir' : 'Expandir'}
                  </Button>
                </div>

                <div className={`transition-all duration-300 ease-in-out ${isPromptExpanded ? 'fixed inset-4 z-50 bg-white shadow-2xl rounded-2xl p-6 ring-2 ring-cyan-100 flex flex-col' : ''}`}>
                  {isPromptExpanded && (
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-800">Editor de Prompt Fullscreen</h3>
                      <Button variant="ghost" size="sm" onClick={() => setIsPromptExpanded(false)}>
                        <Minimize2 className="h-4 w-4 mr-2" /> Reduzir
                      </Button>
                    </div>
                  )}
                  <Textarea
                    id="prompt_ia"
                    value={formData.prompt_ia || ''}
                    onChange={(e) => setFormData({ ...formData, prompt_ia: e.target.value })}
                    placeholder="Você é uma assistente virtual especializada..."
                    className={`rounded-xl border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 font-mono text-sm leading-relaxed ${isPromptExpanded ? 'flex-1 resize-none' : 'h-52 resize-y'}`}
                  />
                  {isPromptExpanded && (
                    <div className="mt-4 flex justify-end">
                      <Button onClick={() => setIsPromptExpanded(false)} className="bg-cyan-600 text-white hover:bg-cyan-700">
                        Concluir Edição
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Seção de Plano Refatorada */}
            <div className="mt-8 pt-8 border-t border-slate-100">

              {/* Alert de Troca Pendente */}
              {pendingSwitchDate && (
                <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 bg-white rounded-full text-amber-500 shadow-sm border border-amber-100">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-amber-900 font-bold mb-1">Mudança de Plano Agendada</h4>
                    <p className="text-amber-700 text-sm leading-relaxed">
                      Sua solicitação de mudança para o plano <strong>{getPlanLabel(pendingPlanName || 'consultorio')}</strong> foi processada.
                      O novo plano entrará em vigor automaticamente em <strong>{pendingSwitchDate}</strong>, ao final do ciclo atual.
                    </p>
                  </div>
                </div>
              )}

              <Label className="mb-4 text-lg font-bold text-slate-900">Sua Assinatura</Label>

              <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-6 relative overflow-hidden group hover:border-cyan-200 transition-colors duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                      {clinicData?.plano === 'corporate' ? <Building2 className="h-7 w-7 text-blue-600" /> :
                        clinicData?.plano === 'clinica_pro' ? <Bot className="h-7 w-7 text-cyan-600" /> : <Users className="h-7 w-7 text-slate-600" />}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                        Plano Atual
                      </p>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-xl text-slate-900 capitalize">
                          {clinicData?.plano === 'corporate' ? 'Plano Corporate' :
                            clinicData?.plano === 'clinica_pro' ? 'Plano Clínica Pro' :
                              clinicData?.plano === 'consultorio' ? 'Plano Consultório' :
                                clinicData?.plano === 'trial' ? 'Plano Trial' : clinicData?.plano}
                        </h3>
                        {clinicData?.subscription_status === 'active' && (
                          <Badge className="rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200">
                            Ativo
                          </Badge>
                        )}
                        {clinicData?.subscription_status === 'canceled' && (
                          <Badge className="rounded-md px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                            Cancelado
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
                          {clinicData.subscription_status === 'active' ? (
                            clinicData.plano === 'trial' || clinicData.plan_id === 'trial' ? 'Período de testes encerra em' :
                              (clinicData.subscription_interval === 'yearly' ? 'Vencimento em' : 'Renovação automática em')
                          ) : 'Acesso atual expira em'}
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
              <>
                {(clinicData?.plano === 'trial' || clinicData?.plan_id === 'trial') ? (
                  <Button
                    size="sm"
                    onClick={() => router.push('/dashboard/planos')}
                    className="h-8 px-3 py-1 text-xs border border-cyan-200 bg-white text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 shadow-none font-normal rounded-md"
                  >
                    Assinar Agora
                  </Button>
                ) : clinicData?.subscription_interval === 'yearly' ? (
                  <Dialog open={isRenewSubscriptionOpen} onOpenChange={setIsRenewSubscriptionOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="h-8 px-3 py-1 text-xs border border-cyan-200 bg-white text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 shadow-none font-normal rounded-md"
                      >
                        Renovar Assinatura
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-cyan-600">
                          <Calendar className="h-5 w-5" />
                          Renovar Assinatura
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-slate-600">
                          Escolha como deseja renovar sua assinatura anual. Lembrando que a nova assinatura vai começar imediatamente e vai até {new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('pt-BR')}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-3 py-4">
                        <Button
                          onClick={handleRenewSamePlan}
                          disabled={saving}
                          className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20 font-semibold transition-all"
                        >
                          {saving ? 'Processando...' : 'Manter o Mesmo Plano'}
                        </Button>
                        <Button
                          onClick={() => {
                            setIsRenewSubscriptionOpen(false)
                            router.push('/dashboard/planos')
                          }}
                          disabled={saving}
                          className="w-full h-12 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold transition-all"
                        >
                          Mudar de Plano
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="flex gap-2">
                    <Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="h-8 px-3 py-1 text-xs border border-cyan-200 bg-white text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 shadow-none font-normal rounded-md"
                        >
                          Mudar de Plano
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-slate-900">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Alteração de Plano
                          </DialogTitle>
                        </DialogHeader>
                        <div className="py-4 text-slate-600 text-sm space-y-3">
                          <p>
                            Antes de continuar, é importante saber como funciona a mudança:
                          </p>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>
                              <strong>Upgrade (Plano Superior):</strong> A mudança é imediata. O valor do novo plano será cobrado integralmente e os dias restantes do plano atual não são abatidos (sem pró-rata).
                            </li>
                            <li>
                              <strong>Downgrade (Plano Inferior):</strong> A alteração será agendada e só entrará em vigor no final do ciclo atual da sua assinatura.
                            </li>
                          </ul>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => {
                              setIsChangePlanOpen(false)
                              router.push('/dashboard/planos')
                            }}
                            className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
                          >
                            Entendi, ir para Planos
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

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
                  </div>
                )}
              </>
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

        {/* Closed Days Management Card */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-white/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Dias Fechados</h2>
              <p className="text-slate-500 text-sm">Gerencie os dias em que a clínica não atenderá (não precisa adicionar feriados nacionais e estaduais, já vem cadastrado)</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Add New Closed Day */}
            <div className="space-y-3">
              <Label htmlFor="new-closed-day" className="text-sm font-medium text-slate-700">
                Adicionar Dia Fechado
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="new-closed-day"
                  type="date"
                  value={newClosedDay}
                  onChange={(e) => setNewClosedDay(e.target.value)}
                  disabled={savingClosedDay}
                  className="flex-1 h-12 rounded-xl border-slate-200 focus:border-cyan-500 focus:ring-cyan-500"
                />
                <Input
                  id="new-closed-day-description"
                  type="text"
                  placeholder="Motivo (ex: Reforma)"
                  value={newClosedDayDescription}
                  onChange={(e) => setNewClosedDayDescription(e.target.value)}
                  disabled={savingClosedDay}
                  className="flex-1 h-12 rounded-xl border-slate-200 focus:border-cyan-500 focus:ring-cyan-500"
                />
                <Button
                  onClick={handleAddClosedDay}
                  disabled={!newClosedDay || savingClosedDay}
                  className="h-12 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20 font-semibold transition-all hover:scale-[1.02] whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>

            {/* List of Closed Days */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700">
                Dias Cadastrados ({closedDays.length})
              </Label>
              {closedDays.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                  Nenhum dia fechado cadastrado
                </div>
              ) : (
                <div className="space-y-2">
                  {closedDays.map((item) => (
                    <div
                      key={item.date}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-xl transition-colors hover:border-cyan-200"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-slate-900 block">
                            {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                          {item.description && (
                            <span className="text-sm text-slate-500">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClosedDay(item)}
                          disabled={savingClosedDay}
                          className="h-9 w-9 p-0 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveClosedDay(item)}
                          disabled={savingClosedDay}
                          className="h-9 w-9 p-0 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          <Dialog open={isDeleteClosedDayOpen} onOpenChange={setIsDeleteClosedDayOpen}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja remover este dia fechado?
                </DialogDescription>
              </DialogHeader>
              {deletingClosedDay && (
                <div className="py-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {new Date(deletingClosedDay.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      {deletingClosedDay.description && (
                        <p className="text-sm text-slate-500">{deletingClosedDay.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteClosedDayOpen(false)
                    setDeletingClosedDay(null)
                  }}
                  disabled={savingClosedDay}
                  className="rounded-xl mx-4 hover:text-black"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmRemoveClosedDay}
                  disabled={savingClosedDay}
                  className="rounded-xl"
                >
                  {savingClosedDay ? 'Removendo...' : 'Remover'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditClosedDayOpen} onOpenChange={setIsEditClosedDayOpen}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Editar Dia Fechado</DialogTitle>
                <DialogDescription>
                  Altere a data ou a descrição do dia fechado
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-closed-day-date">Data</Label>
                  <Input
                    id="edit-closed-day-date"
                    type="date"
                    value={editClosedDayDate}
                    onChange={(e) => setEditClosedDayDate(e.target.value)}
                    disabled={savingClosedDay}
                    className="h-12 rounded-xl border-slate-200 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-closed-day-description">Descrição</Label>
                  <Input
                    id="edit-closed-day-description"
                    type="text"
                    placeholder="Motivo (ex: Feriado de Natal, Reforma)"
                    value={editClosedDayDescription}
                    onChange={(e) => setEditClosedDayDescription(e.target.value)}
                    disabled={savingClosedDay}
                    className="h-12 rounded-xl border-slate-200 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditClosedDayOpen(false)
                    setEditingClosedDay(null)
                    setEditClosedDayDate('')
                    setEditClosedDayDescription('')
                  }}
                  disabled={savingClosedDay}
                  className="rounded-xl mx-4 hover:text-black"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmEditClosedDay}
                  disabled={savingClosedDay || !editClosedDayDate}
                  className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700"
                >
                  {savingClosedDay ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Doctors Management Card */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-white/50">
          <div id="profissionais-section" className="flex items-center justify-between mb-8">
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
                      <SelectTrigger id="prof-genero" className="rounded-xl border-slate-200 cursor-pointer">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem className="cursor-pointer" value="masculino">Masculino</SelectItem>
                        <SelectItem className="cursor-pointer" value="feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="prof-calendar">Calendário</Label>
                    <Select
                      value={profissionalForm.external_calendar_id}
                      onValueChange={(value) => setProfissionalForm({ ...profissionalForm, external_calendar_id: value })}
                    >
                      <SelectTrigger id="prof-calendar" className="rounded-xl border-slate-200 cursor-pointer">
                        <SelectValue placeholder="Selecione um calendário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary" className="cursor-pointer">Principal (clínica)</SelectItem>
                        {calendars
                          .filter(c => c.id !== 'primary')
                          .map((calendar) => (
                            <SelectItem key={calendar.id} value={calendar.id} className="cursor-pointer">
                              {calendar.summary}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={() => setIsAddProfissionalOpen(false)} disabled={saving} className="rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-500 transition-colors">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddProfissional}
                    disabled={
                      saving ||
                      !profissionalForm.nome ||
                      !profissionalForm.especialidade ||
                      !profissionalForm.genero
                    }
                    className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20 font-semibold transition-all"
                  >
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
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(profissional)}
                      className="hover:bg-slate-100 rounded-lg text-slate-500 hover:text-cyan-700"
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"
                      onClick={() => openDeleteDialog(profissional.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Operating Hours Editor */}
        {clinicData?.horario_funcionamento && (
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-white/50">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Horário de Funcionamento</h2>
                <p className="text-slate-500 text-sm">Configure os dias e horários de atendimento da clínica</p>
              </div>
            </div>

            <div className="space-y-4">
              {horarioFuncionamento.map((item, index) => (
                <div key={item.dia} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 rounded-xl gap-4 hover:border-cyan-200 transition-colors">
                  <div className="flex items-center gap-4 min-w-[140px]">
                    <Switch
                      checked={item.ativo}
                      onCheckedChange={(checked) => {
                        const newHorarios = [...horarioFuncionamento]
                        newHorarios[index].ativo = checked
                        setHorarioFuncionamento(newHorarios)
                      }}
                      className="data-[state=checked]:bg-cyan-600 cursor-pointer"
                    />
                    <span className={`font-medium ${item.ativo ? 'text-slate-900' : 'text-slate-400'}`}>
                      {item.dia}
                    </span>
                  </div>

                  {item.ativo ? (
                    <div className="flex items-center gap-2 flex-1 sm:justify-end">
                      <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <Input
                          type="time"
                          value={item.abertura}
                          onChange={(e) => {
                            const newHorarios = [...horarioFuncionamento]
                            newHorarios[index].abertura = e.target.value
                            setHorarioFuncionamento(newHorarios)
                          }}
                          className="w-24 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 text-center font-medium shadow-none p-0"
                        />
                        <span className="text-slate-400 text-xs">até</span>
                        <Input
                          type="time"
                          value={item.fechamento}
                          onChange={(e) => {
                            const newHorarios = [...horarioFuncionamento]
                            newHorarios[index].fechamento = e.target.value
                            setHorarioFuncionamento(newHorarios)
                          }}
                          className="w-24 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 text-center font-medium shadow-none p-0"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 text-right text-sm text-slate-400 italic pr-4">
                      Fechado
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
              <Button
                onClick={handleSaveClinic}
                disabled={saving}
                className="h-12 px-8 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/20 font-semibold transition-all hover:scale-[1.02]"
              >
                {saving ? 'Salvando...' : 'Salvar Horários'}
              </Button>
            </div>
          </div>
        )}

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
                <Label htmlFor="edit-prof-calendar">Calendário</Label>
                <Select
                  value={profissionalForm.external_calendar_id}
                  onValueChange={(value) => setProfissionalForm({ ...profissionalForm, external_calendar_id: value })}
                >
                  <SelectTrigger id="edit-prof-calendar" className="rounded-xl border-slate-200 cursor-pointer">
                    <SelectValue placeholder="Selecione um calendário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary" className="cursor-pointer">Principal (clínica)</SelectItem>
                    {calendars
                      .filter(c => c.id !== 'primary')
                      .map((calendar) => (
                        <SelectItem key={calendar.id} value={calendar.id} className="cursor-pointer">
                          {calendar.summary}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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

      </main >
    </div >
  )
}

