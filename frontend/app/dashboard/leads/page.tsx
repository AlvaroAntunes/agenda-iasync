"use client"

import { useEffect, useState } from "react"
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
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Loader2, Plus } from "lucide-react"
import { ClinicLoading } from "@/components/ClinicLoading"
import { toast } from "sonner"
import { useSubscriptionCheck } from "@/lib/use-subscription-check"
import { logger } from "@/lib/logger"
import { useClinic } from "../../contexts/ClinicContext"
import { TrialBanner } from "@/components/TrialBanner"

export default function LeadsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  useSubscriptionCheck()

  const { clinicData, setClinicData } = useClinic()

  const [clinicId, setClinicId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showNewLeadModal, setShowNewLeadModal] = useState(false)

  const { leads, loading, refresh } = useLeads(clinicId)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login/clinic")
          return
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("clinic_id, role")
          .eq("id", user.id)
          .single()

        if (error || !profile || profile.role !== "clinic_admin" || !profile.clinic_id) {
          router.push("/login/clinic")
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
        router.push("/login/clinic")
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

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
      }

      const { error } = await supabase.from("leads").insert(insertData).select().single()
      if (error) throw error

      toast.success(`Lead "${fullName || "Sem nome"}" criado com sucesso`)
      setShowNewLeadModal(false)
      refresh()
    } catch (err: any) {
      logger.error("Erro ao criar lead:", err)
      toast.error(err?.message || "Erro ao criar lead")
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
            <Button onClick={() => setShowNewLeadModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo lead
            </Button>
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
                    <TableHead>LID</TableHead>
                    <TableHead>Data de criação</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        Nenhum lead encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.nome || "Sem nome"}</TableCell>
                        <TableCell>{lead.telefone || "-"}</TableCell>
                        <TableCell>{lead.lid || "-"}</TableCell>
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

        <NewLeadModal
          open={showNewLeadModal}
          onOpenChange={setShowNewLeadModal}
          mode="create"
          onCreateLead={handleCreateLead}
        />
      </main>
    </div>
  )
}
