"use client"

import { createContext, useContext, useState, Dispatch, SetStateAction } from "react"

export type ClinicData = {
  id: string
  nome: string
  email: string
  telefone: string
  endereco: string
  uf: string
  cidade: string
  prompt_ia: string
  ia_ativa: boolean
  uazapi_token?: string | null
  plano: 'basic' | 'premium' | 'enterprise'
  tipo_calendario: 'google' | 'outlook'
  calendar_refresh_token: string | null
  saldo_tokens: number
  tokens_comprados: number
  assinaturas?: {
    planos?: {
      max_tokens: number
    } | null
  }[] | null
}

type ClinicContextType = {
  clinicData: ClinicData | null
  setClinicData: Dispatch<SetStateAction<ClinicData | null>>
}

const ClinicContext = createContext<ClinicContextType | null>(null)

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [clinicData, setClinicData] = useState<ClinicData | null>(null)

  return (
    <ClinicContext.Provider value={{ clinicData, setClinicData }}>
      {children}
    </ClinicContext.Provider>
  )
}

export function useClinic() {
  const context = useContext(ClinicContext)
  if (!context) {
    throw new Error("useClinic must be used within ClinicProvider")
  }
  return context
}
