"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export type NewLeadFormData = {
  firstName: string
  lastName: string
  phone: string
  countryCode: string
}

type NewLeadModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "create" | "edit"
  initialData?: Partial<NewLeadFormData>
  onCreateLead?: (data: NewLeadFormData) => Promise<void> | void
  onUpdateLead?: (data: NewLeadFormData) => Promise<void> | void
}

const COUNTRY_CODES = [
  { label: "Brasil (+55)", value: "BR +55" },
  { label: "Portugal (+351)", value: "PT +351" },
  { label: "Estados Unidos (+1)", value: "US +1" },
]

export function NewLeadModal({
  open,
  onOpenChange,
  mode = "create",
  initialData,
  onCreateLead,
  onUpdateLead,
}: NewLeadModalProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].value)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setFirstName("")
      setLastName("")
      setPhone("")
      setCountryCode(COUNTRY_CODES[0].value)
      setSubmitting(false)
      return
    }
    if (mode === "edit" && initialData) {
      setFirstName(initialData.firstName || "")
      setLastName(initialData.lastName || "")
      setPhone(initialData.phone || "")
      setCountryCode(initialData.countryCode || COUNTRY_CODES[0].value)
    } else if (mode === "create") {
      setFirstName("")
      setLastName("")
      setPhone("")
      setCountryCode(COUNTRY_CODES[0].value)
    }
  }, [open, mode, initialData])

  const handleSubmit = async () => {
    if (!firstName.trim() || !phone.trim()) {
      toast.error("Preencha nome e telefone.")
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        countryCode,
      }
      if (mode === "edit") {
        if (!onUpdateLead) throw new Error("onUpdateLead não informado")
        await onUpdateLead(payload)
        toast.success("Lead atualizado com sucesso!")
      } else {
        if (!onCreateLead) throw new Error("onCreateLead não informado")
        await onCreateLead(payload)
        toast.success("Lead criado com sucesso!")
      }
      onOpenChange(false)
    } catch {
      toast.error(mode === "edit" ? "Não foi possível atualizar o lead." : "Não foi possível criar o lead.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Overlay (fundo escuro) */}
      <DialogOverlay className="bg-black/50" />

      {/* Conteúdo (modal) */}
      <DialogContent className="sm:max-w-md bg-white text-black">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar lead" : "Novo lead"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {mode === "edit" ? "Atualize os dados do paciente." : "Adicione um novo paciente na sua base."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="firstName">Nome</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Ex: Maria"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lastName">Sobrenome</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Ex: Souza"
            />
          </div>

          <div className="grid gap-2">
            <Label>DDI</Label>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o DDI" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Salvando..." : mode === "edit" ? "Salvar" : "Criar lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
