"use client"

import { useCallback, useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { logger } from "@/lib/logger"

export type Lead = {
  id: string
  nome: string
  telefone: string
  lid: string
  created_at: string
}

export function useLeads(clinicId?: string | null) {
  const supabase = getSupabaseBrowserClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchLeads = useCallback(async () => {
    if (!clinicId) {
      setLeads([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")

    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, nome, telefone, lid, created_at")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setLeads(data || [])
    } catch (err: any) {
      logger.error("Erro ao carregar leads:", err)
      setError(err?.message || "Erro ao carregar leads")
    } finally {
      setLoading(false)
    }
  }, [clinicId, supabase])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  return { leads, loading, error, refresh: fetchLeads }
}
