"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Building2, 
  Plus, 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Search,
  Eye,
  EyeOff
} from "lucide-react"
import Link from "next/link"

type Clinic = {
  id: string
  nome: string
  email: string
  telefone: string
  endereco?: string
  uf?: string
  cidade?: string
  plano: 'basic' | 'premium' | 'enterprise'
  tipo_calendario: 'google' | 'outlook'
  ia_ativa: boolean
  created_at: string
  prompt_ia?: string
}

export default function ClinicsManagementPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  
  // Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentClinic, setCurrentClinic] = useState<Clinic | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<{
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
    // Dados do usuário admin da clínica
    admin_nome: string
    admin_email: string
    admin_senha: string
    admin_telefone: string
  }>({
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
    uf: "",
    cidade: "",
    prompt_ia: "",
    ia_ativa: true,
    plano: "basic",
    tipo_calendario: "google",
    admin_nome: "",
    admin_email: "",
    admin_senha: "",
    admin_telefone: "",
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login/admin')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'super_admin') {
        router.push('/login/admin')
        return
      }

      loadClinics()
    } catch (error) {
      logger.error('Erro ao verificar autenticação:', error)
      router.push('/login/admin')
    }
  }

  const loadClinics = async () => {
    try {
      const { data, error } = await supabase
        .from('clinicas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setClinics(data || [])
    } catch (error) {
      logger.error('Erro ao carregar clínicas:', error)
      setError('Erro ao carregar clínicas')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      setError("")
      setSuccess("")

      // Validar campos do admin
      if (!formData.admin_nome || !formData.admin_email || !formData.admin_senha) {
        setError("Preencha os dados do administrador da clínica")
        return
      }

      if (formData.admin_senha.length < 6) {
        setError("A senha deve ter no mínimo 6 caracteres")
        return
      }

      // Criar clínica e usuário via API
      const response = await fetch('/api/admin/create-clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Importante: envia os cookies de autenticação
        body: JSON.stringify({
          clinic: {
            nome: formData.nome,
            email: formData.email,
            telefone: formData.telefone,
            endereco: formData.endereco,
            uf: formData.uf,
            cidade: formData.cidade,
            prompt_ia: formData.prompt_ia,
            ia_ativa: formData.ia_ativa,
            plano: formData.plano,
            tipo_calendario: formData.tipo_calendario,
          },
          admin: {
            full_name: formData.admin_nome,
            email: formData.admin_email,
            password: formData.admin_senha,
            phone: formData.admin_telefone,
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar clínica')
      }

      setSuccess("Clínica e usuário criados com sucesso!")
      setIsDialogOpen(false)
      resetForm()
      loadClinics()
    } catch (error: any) {
      logger.error('Erro ao criar clínica:', error)
      setError(error.message || 'Erro ao criar clínica')
    }
  }

  const handleUpdate = async () => {
    if (!currentClinic) return

    try {
      setError("")
      setSuccess("")

      // Enviar apenas os campos da clínica (sem campos do admin)
      const clinicData = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        endereco: formData.endereco,
        uf: formData.uf,
        cidade: formData.cidade,
        prompt_ia: formData.prompt_ia,
        ia_ativa: formData.ia_ativa,
        plano: formData.plano,
        tipo_calendario: formData.tipo_calendario,
      }

      const { error } = await supabase
        .from('clinicas')
        .update(clinicData)
        .eq('id', currentClinic.id)

      if (error) throw error

      setSuccess("Clínica atualizada com sucesso!")
      setIsDialogOpen(false)
      resetForm()
      loadClinics()
    } catch (error: any) {
      logger.error('Erro ao atualizar clínica:', error)
      setError(error.message || 'Erro ao atualizar clínica')
    }
  }

  const handleDelete = async (clinic: Clinic) => {
    if (!confirm(`Tem certeza que deseja excluir a clínica "${clinic.nome}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      setError("")
      setSuccess("")

      const { error } = await supabase
        .from('clinicas')
        .delete()
        .eq('id', clinic.id)

      if (error) throw error

      setSuccess("Clínica excluída com sucesso!")
      loadClinics()
    } catch (error: any) {
      logger.error('Erro ao excluir clínica:', error)
      setError(error.message || 'Erro ao excluir clínica')
    }
  }

  const openCreateDialog = () => {
    resetForm()
    setIsEditing(false)
    setCurrentClinic(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (clinic: Clinic) => {
    setFormData({
      nome: clinic.nome,
      email: clinic.email,
      telefone: clinic.telefone,
      endereco: clinic.endereco || "",
      uf: clinic.uf || "",
      cidade: clinic.cidade || "",
      prompt_ia: clinic.prompt_ia || "",
      ia_ativa: clinic.ia_ativa,
      tipo_calendario: clinic.tipo_calendario,
      plano: clinic.plano,
      // Campos de admin vazios ao editar (não são editáveis)
      admin_nome: "",
      admin_email: "",
      admin_senha: "",
      admin_telefone: "",
    })
    setIsEditing(true)
    setCurrentClinic(clinic)
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      telefone: "",
      endereco: "",
      uf: "",
      cidade: "",
      prompt_ia: "",
      ia_ativa: true,
      plano: "basic",
      tipo_calendario: "google",
      admin_nome: "",
      admin_email: "",
      admin_senha: "",
      admin_telefone: "",
    })
  }

  const filteredClinics = clinics.filter(clinic =>
    clinic.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clinic.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clinic.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">Gerenciar Clínicas</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8">
        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clínicas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Clínica
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Clínica' : 'Nova Clínica'}</DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Atualize as informações da clínica' : 'Preencha os dados da nova clínica'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome da Clínica *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Clínica Dental São Paulo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contato@clinica.com"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua exemplo, 123"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      placeholder="São Paulo"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="uf">UF</Label>
                    <Input
                      id="uf"
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="prompt_ia">
                    Prompt da IA
                    <span className="text-xs text-muted-foreground ml-2">
                      (Instruções para o bot de WhatsApp)
                    </span>
                  </Label>
                  <Textarea
                    id="prompt_ia"
                    value={formData.prompt_ia}
                    onChange={(e) => setFormData({ ...formData, prompt_ia: e.target.value })}
                    placeholder="Digite as instruções personalizadas para a IA desta clínica. Por exemplo: 'Você é o assistente virtual da Clínica XYZ. Seja educado e solicite sempre o nome completo do paciente antes de agendar...'"
                    className="min-h-[200px] resize-y"
                    rows={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este prompt personaliza como a IA vai interagir com os pacientes via WhatsApp
                  </p>
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
                    checked={formData.ia_ativa}
                    onCheckedChange={(checked) => setFormData({ ...formData, ia_ativa: checked })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="plano">Plano</Label>
                    <Select 
                      value={formData.plano} 
                      onValueChange={(value: any) => setFormData({ ...formData, plano: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tipo_calendario">Tipo de Calendário</Label>
                    <Select 
                      value={formData.tipo_calendario} 
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
                </div>

                {/* Seção de dados do administrador - apenas ao criar */}
                {!isEditing && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-lg font-semibold mb-4">Dados do Administrador da Clínica</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Crie o primeiro usuário admin que terá acesso ao dashboard desta clínica
                      </p>

                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="admin_nome">Nome Completo do Admin *</Label>
                          <Input
                            id="admin_nome"
                            value={formData.admin_nome}
                            onChange={(e) => setFormData({ ...formData, admin_nome: e.target.value })}
                            placeholder="Dr. João Silva"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="admin_email">Email do Admin *</Label>
                            <Input
                              id="admin_email"
                              type="email"
                              value={formData.admin_email}
                              onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                              placeholder="admin@clinica.com"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="admin_telefone">Telefone do Admin</Label>
                            <Input
                              id="admin_telefone"
                              value={formData.admin_telefone}
                              onChange={(e) => setFormData({ ...formData, admin_telefone: e.target.value })}
                              placeholder="(11) 99999-9999"
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="admin_senha">Senha do Admin *</Label>
                          <div className="relative">
                            <Input
                              id="admin_senha"
                              type={showPassword ? "text" : "password"}
                              value={formData.admin_senha}
                              onChange={(e) => setFormData({ ...formData, admin_senha: e.target.value })}
                              placeholder="Mínimo 6 caracteres"
                              minLength={6}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            O admin poderá alterar a senha após o primeiro login
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={isEditing ? handleUpdate : handleCreate}>
                  {isEditing ? 'Atualizar' : 'Criar'} Clínica
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Clínicas Cadastradas</CardTitle>
            <CardDescription>
              Total de {filteredClinics.length} clínica(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>IA</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClinics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma clínica encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClinics.map((clinic) => (
                      <TableRow key={clinic.id}>
                        <TableCell className="font-medium">{clinic.nome}</TableCell>
                        <TableCell>{clinic.email}</TableCell>
                        <TableCell>{clinic.telefone}</TableCell>
                        <TableCell>
                          {clinic.cidade && clinic.uf ? `${clinic.cidade}/${clinic.uf}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            clinic.plano === 'enterprise' ? 'default' :
                            clinic.plano === 'premium' ? 'secondary' : 'outline'
                          }>
                            {clinic.plano}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={clinic.ia_ativa ? 'default' : 'secondary'}>
                            {clinic.ia_ativa ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(clinic)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(clinic)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
