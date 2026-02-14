"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLeads } from "@/hooks/useLeads"
import { ClinicHeader } from "@/components/Header"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { NewLeadModal, type NewLeadFormData } from "@/components/NewLeadModal"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Loader2, Plus, Tag, Pencil, Trash2 } from "lucide-react"
import { ClinicLoading } from "@/components/ClinicLoading"
import { toast } from "sonner"
import { useSubscriptionCheck } from "@/lib/use-subscription-check"
import { logger } from "@/lib/logger"
import { useClinic } from "../../contexts/ClinicContext"
import { TrialBanner } from "@/components/TrialBanner"

type TagItem = {
  id: string
  name: string
  color: string
  is_system?: boolean
}

export default function LeadsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  useSubscriptionCheck()

  const { clinicData, setClinicData } = useClinic()

  const [clinicId, setClinicId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showNewLeadModal, setShowNewLeadModal] = useState(false)
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [tags, setTags] = useState<TagItem[]>([])
  const [leadTags, setLeadTags] = useState<Record<string, TagItem[]>>({})
  const [tagName, setTagName] = useState("")
  const [tagColor, setTagColor] = useState("#22c55e")
  const [tagSaving, setTagSaving] = useState(false)
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null)
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [editingLeadData, setEditingLeadData] = useState<NewLeadFormData | null>(null)
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null)
  const [tagEditingId, setTagEditingId] = useState<string | null>(null)
  const [tagEditingIsSystem, setTagEditingIsSystem] = useState(false)

  const { leads, loading, refresh, setLeads } = useLeads(clinicId)

  const tagsById = useMemo(() => {
    const map = new Map<string, TagItem>()
    tags.forEach((tag) => map.set(tag.id, tag))
    return map
  }, [tags])

  const ensureDefaultTags = useCallback(
    async (onlyNames?: string[]) => {
      if (!clinicId) return
      const defaults = [
        { name: "Novo", color: "#22c55e" },
        { name: "Lead", color: "#0ea5e9" },
        { name: "Agendado", color: "#10b981" },
        { name: "Perdido", color: "#ef4444" },
      ]
      const payload = defaults
        .filter((item) => !onlyNames || onlyNames.includes(item.name))
        .map((item) => ({
          clinic_id: clinicId,
          name: item.name,
          color: item.color,
          is_system: true,
        }))
      if (payload.length === 0) return
      try {
        const { error } = await supabase
          .from("tags")
          .upsert(payload, { onConflict: "clinic_id,name" })
        if (error) throw error
        const { data } = await supabase
          .from("tags")
          .select("id, name, color, is_system")
          .eq("clinic_id", clinicId)
          .order("name", { ascending: true })
        setTags((data || []) as TagItem[])
      } catch (err) {
        logger.error("Erro ao criar tags padrão:", err)
      }
    },
    [clinicId, supabase]
  )

  const loadTags = useCallback(async () => {
    if (!clinicId) return
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, color, is_system")
        .eq("clinic_id", clinicId)
        .order("name", { ascending: true })
      if (error) {
        if ((error as any)?.code === "42P01") {
          setTags([])
          return
        }
        throw error
      }
      const list = (data || []) as TagItem[]
      setTags(list)
      if (list.length) {
        const required = ["Agendado", "Lead", "Novo", "Perdido"]
        const missing = required.filter(
          (name) => !list.some((tag) => tag.name.toLowerCase() === name.toLowerCase())
        )
        if (missing.length) {
          await ensureDefaultTags(missing)
        }
      } else {
        await ensureDefaultTags()
      }
    } catch (err) {
      logger.error("Erro ao carregar tags:", err)
    }
  }, [clinicId, supabase, ensureDefaultTags])

  const loadLeadTags = useCallback(async () => {
    if (!clinicId || leads.length === 0) {
      setLeadTags({})
      return
    }
    const leadIds = leads.map((lead) => lead.id)
    try {
      const { data, error } = await supabase
        .from("lead_tags")
        .select("lead_id, tags(id, name, color)")
        .in("lead_id", leadIds)
      if (error) {
        if ((error as any)?.code === "42P01") {
          setLeadTags({})
          return
        }
        throw error
      }
      const map: Record<string, TagItem[]> = {}
      for (const row of data || []) {
        const tag = (row as any).tags as TagItem | null
        if (!tag) continue
        const leadId = (row as any).lead_id as string
        if (!map[leadId]) map[leadId] = []
        map[leadId].push(tag)
      }
      setLeadTags(map)
    } catch (err) {
      logger.error("Erro ao carregar tags dos leads:", err)
    }
  }, [clinicId, leads, supabase])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("clinic_id, role")
          .eq("id", user.id)
          .single()

        if (error || !profile || profile.role !== "clinic_admin" || !profile.clinic_id) {
          router.push("/login")
          return
        }

        setClinicId(profile.clinic_id)

        // Carrega clinicData no contexto (pra header e outras telas)
        if (!clinicData?.id || clinicData.id !== profile.clinic_id) {
          const { data: clinic, error: clinicError } = await supabase
            .from("clinicas")
            .select("*")
            .eq("id", profile.clinic_id)
            .single()

          if (clinicError) throw clinicError

          setClinicData(clinic)
        }
      } catch (err) {
        logger.error("Erro ao validar sessão:", err)
        router.push("/login")
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    if (!clinicId) return
    loadTags()
  }, [clinicId, loadTags])

  useEffect(() => {
    loadLeadTags()
  }, [loadLeadTags])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleCreateLead = async (data: NewLeadFormData) => {
    if (!clinicId) {
      toast.error("Clínica não identificada")
      return
    }

    try {
      const fullName = `${data.firstName} ${data.lastName}`.trim()
      const ddi = data.countryCode.split(" ")[1] || data.countryCode
      const rawPhone = data.phone.replace(/\D/g, "")

      if (!rawPhone) {
        toast.error("Informe um telefone válido")
        return
      }

      const phone = `${ddi.replace("+", "")}${rawPhone}`

      const insertData = {
        clinic_id: clinicId,
        nome: fullName || "Sem nome",
        telefone: phone,
        lid: phone,
        status_ia: true,
      }

      const { error } = await supabase.from("leads").insert(insertData).select().single()
      if (error) {
        // Detecta erro de duplicidade
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          throw new Error("Este telefone já está cadastrado no sistema")
        }
        throw error
      }

      setShowNewLeadModal(false)
      refresh()
    } catch (err: any) {
      logger.error("Erro ao criar lead:", err)
      throw err
    }
  }

  const parseCountryCode = (phone: string) => {
    if (phone.startsWith("55")) return "BR +55"
    if (phone.startsWith("351")) return "PT +351"
    if (phone.startsWith("1")) return "US +1"
    return "BR +55"
  }

  const stripCountryCode = (phone: string) => {
    if (phone.startsWith("55")) return phone.slice(2)
    if (phone.startsWith("351")) return phone.slice(3)
    if (phone.startsWith("1")) return phone.slice(1)
    return phone
  }

  const handleEditLead = (lead: typeof leads[number]) => {
    const [firstName, ...rest] = (lead.nome || "").trim().split(" ")
    const lastName = rest.join(" ")
    const phone = stripCountryCode(lead.telefone || "")
    setEditingLeadId(lead.id)
    setEditingLeadData({
      firstName: firstName || "",
      lastName,
      phone,
      countryCode: parseCountryCode(phone),
    })
  }

  const handleUpdateLead = async (data: NewLeadFormData) => {
    if (!clinicId || !editingLeadId) return
    try {
      const fullName = `${data.firstName} ${data.lastName}`.trim()
      const ddi = data.countryCode.split(" ")[1] || data.countryCode
      const rawPhone = data.phone.replace(/\D/g, "")
      if (!rawPhone) {
        toast.error("Informe um telefone válido")
        return
      }
      const phone = `${ddi.replace("+", "")}${rawPhone}`
      const { error } = await supabase
        .from("leads")
        .update({ nome: fullName || "Sem nome", telefone: phone, lid: phone })
        .eq("id", editingLeadId)
      if (error) throw error
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === editingLeadId
            ? { ...lead, nome: fullName || "Sem nome", telefone: phone }
            : lead
        )
      )
      setEditingLeadId(null)
      setEditingLeadData(null)
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar lead")
    }
  }

  const handleDeleteLead = async () => {
    if (!deleteLeadId) return
    try {
      const { error } = await supabase.from("leads").delete().eq("id", deleteLeadId)
      if (error) throw error
      setLeads((prev) => prev.filter((lead) => lead.id !== deleteLeadId))
      setDeleteLeadId(null)
      toast.success("Lead excluído")
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir lead")
    }
  }

  const handleToggleLeadIA = async (leadId: string, nextValue: boolean) => {
    if (!clinicId) return
    setUpdatingLeadId(leadId)
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, status_ia: nextValue } : lead))
    )
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status_ia: nextValue })
        .eq("id", leadId)
      if (error) throw error
    } catch (err: any) {
      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? { ...lead, status_ia: !nextValue } : lead))
      )
      toast.error(err?.message || "Erro ao atualizar status da IA")
    } finally {
      setUpdatingLeadId(null)
    }
  }

  const handleSaveTag = async () => {
    if (!clinicId) return
    const name = tagName.trim()
    if (!name) {
      toast.error("Informe o nome da tag")
      return
    }
    setTagSaving(true)
    try {
      if (tagEditingId) {
        const { data, error } = await supabase
          .from("tags")
          .update({ name, color: tagColor })
          .eq("id", tagEditingId)
          .select("id, name, color, is_system")
          .single()
        if (error) throw error
        setTags((prev) => prev.map((tag) => (tag.id === tagEditingId ? (data as TagItem) : tag)))
        setLeadTags((prev) => {
          const next: Record<string, TagItem[]> = {}
          for (const [leadId, leadTagList] of Object.entries(prev)) {
            next[leadId] = leadTagList.map((tag) =>
              tag.id === tagEditingId ? (data as TagItem) : tag
            )
          }
          return next
        })
      } else {
        const { data, error } = await supabase
          .from("tags")
          .insert({ clinic_id: clinicId, name, color: tagColor, is_system: false })
          .select("id, name, color, is_system")
          .single()
        if (error) throw error
        setTags((prev) => [...prev, data as TagItem])
      }
      setTagName("")
      setTagEditingId(null)
      setTagEditingIsSystem(false)
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar tag")
    } finally {
      setTagSaving(false)
    }
  }

  const handleEditTag = (tag: TagItem) => {
    setTagEditingId(tag.id)
    setTagName(tag.name)
    setTagColor(tag.color)
    setTagEditingIsSystem(Boolean(tag.is_system))
  }

  const handleDeleteTag = async (tagId: string) => {
    try {
      const tag = tags.find((item) => item.id === tagId)
      if (tag?.is_system) {
        toast.info("Tags padrão não podem ser excluídas")
        return
      }
      const { error } = await supabase.from("tags").delete().eq("id", tagId)
      if (error) throw error
      setTags((prev) => prev.filter((tag) => tag.id !== tagId))
      setLeadTags((prev) => {
        const next: Record<string, TagItem[]> = {}
        for (const [leadId, leadTagList] of Object.entries(prev)) {
          next[leadId] = leadTagList.filter((tag) => tag.id !== tagId)
        }
        return next
      })
      if (tagEditingId === tagId) {
        setTagEditingId(null)
        setTagName("")
        setTagEditingIsSystem(false)
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir tag")
    }
  }

  const toggleLeadTag = async (leadId: string, tagId: string, checked: boolean) => {
    if (!clinicId) return
    try {
      if (checked) {
        const { error } = await supabase
          .from("lead_tags")
          .insert({ clinic_id: clinicId, lead_id: leadId, tag_id: tagId })
        if (error) throw error
        const tag = tagsById.get(tagId)
        if (tag) {
          setLeadTags((prev) => ({
            ...prev,
            [leadId]: [...(prev[leadId] || []), tag],
          }))
        }
      } else {
        const { error } = await supabase
          .from("lead_tags")
          .delete()
          .eq("lead_id", leadId)
          .eq("tag_id", tagId)
        if (error) throw error
        setLeadTags((prev) => ({
          ...prev,
          [leadId]: (prev[leadId] || []).filter((tag) => tag.id !== tagId),
        }))
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar tags")
    }
  }

  if (authLoading) {
    return <ClinicLoading />
  }

  return (
    <div className="min-h-screen bg-background">

      <ClinicHeader clinicName={clinicData?.nome} onSignOut={handleSignOut} />
      <main className="container mx-auto px-6 py-8">
        {clinicData?.id && (
          <TrialBanner clinicId={clinicData.id} blockAccess={false} />
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leads</CardTitle>
            <div className="flex items-center gap-2">
              <Button className="hover:text-black" variant="outline" size="sm" onClick={() => setTagDialogOpen(true)}>
                <Tag className="mr-2 h-4 w-4" /> Tags
              </Button>
              <Button size="sm" onClick={() => setShowNewLeadModal(true)}>
                <Plus className="mr-2 h-4 w-4" /> Novo lead
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <ClinicLoading message="Carregando leads..." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>IA</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Ações</TableHead>
                    <TableHead>Data de criação</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Nenhum lead encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.nome || "Sem nome"}</TableCell>
                        <TableCell>{lead.telefone || "-"}</TableCell>
                        <TableCell>
                          <Switch
                            className="cursor-pointer data-[state=checked]:bg-blue-600"
                            checked={Boolean(lead.status_ia)}
                            onCheckedChange={(checked) => handleToggleLeadIA(lead.id, checked)}
                            disabled={updatingLeadId === lead.id}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex flex-wrap gap-1">
                              {(leadTags[lead.id] || []).map((tag) => (
                                <Badge
                                  key={tag.id}
                                  style={{ backgroundColor: tag.color, color: "#ffffff" }}
                                >
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                            {tags.length > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    Editar
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {tags.map((tag) => {
                                    const isChecked = (leadTags[lead.id] || []).some(
                                      (leadTag) => leadTag.id === tag.id
                                    )
                                    return (
                                      <DropdownMenuCheckboxItem
                                        key={tag.id}
                                        checked={isChecked}
                                        className="cursor-pointer"
                                        onCheckedChange={(checked) =>
                                          toggleLeadTag(lead.id, tag.id, Boolean(checked))
                                        }
                                      >
                                        <span className="inline-flex items-center gap-2">
                                          <span
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: tag.color }}
                                          />
                                          {tag.name}
                                        </span>
                                      </DropdownMenuCheckboxItem>
                                    )
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLead(lead)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteLeadId(lead.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.created_at
                            ? format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Tags</DialogTitle>
              <DialogDescription>
                Crie tags para organizar seus leads e aplique nas conversas.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nome da tag"
                  value={tagName}
                  onChange={(event) => setTagName(event.target.value)}
                  disabled={tagEditingIsSystem}
                  className="disabled:cursor-not-allowed flex-1"
                />
                <input
                  type="color"
                  value={tagColor}
                  onChange={(event) => setTagColor(event.target.value)}
                  className="cursor-pointer h-9 w-8 rounded border border-border bg-transparent shrink-0"
                  aria-label="Cor da tag"
                />
                <Button onClick={handleSaveTag} disabled={tagSaving}>
                  {tagSaving ? "Salvando..." : tagEditingId ? "Salvar" : "Criar"}
                </Button>
                {tagEditingId && (
                  <Button
                    className="hover:text-black"
                    variant="ghost"
                    onClick={() => {
                      setTagEditingId(null)
                      setTagName("")
                      setTagColor("#22c55e")
                      setTagEditingIsSystem(false)
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Nenhuma tag criada</span>
                ) : (
                  tags.map((tag) => (
                    <div key={tag.id} className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-xs font-medium text-black">{tag.name}</span>
                      {tag.is_system && (
                        <span className="text-[10px] text-muted-foreground">padrão</span>
                      )}
                      <button
                        type="button"
                        className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleEditTag(tag)}
                      >
                        editar
                      </button>
                      {!tag.is_system && (
                        <button
                          type="button"
                          className="cursor-pointer text-xs text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          excluir
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(deleteLeadId)} onOpenChange={(open) => !open && setDeleteLeadId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir lead</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este lead? Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="hover:text-black">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteLead}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <NewLeadModal
          open={showNewLeadModal}
          onOpenChange={setShowNewLeadModal}
          mode="create"
          onCreateLead={handleCreateLead}
        />
        <NewLeadModal
          open={Boolean(editingLeadId)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingLeadId(null)
              setEditingLeadData(null)
            }
          }}
          mode="edit"
          initialData={editingLeadData || undefined}
          onUpdateLead={handleUpdateLead}
        />
      </main>
    </div>
  )
}
