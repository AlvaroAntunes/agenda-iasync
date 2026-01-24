"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { ClinicHeader } from "@/components/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useSubscriptionCheck } from "@/lib/use-subscription-check"
import { logger } from "@/lib/logger"
import { useClinic } from "../../contexts/ClinicContext"

type Conversation = {
  sessionId: string
  lastMessage: string
  lastSender: "user" | "ai"
  lastAt: string
  leadName?: string | null
}

type ChatMessage = {
  id: string
  session_id: string
  quem_enviou: "user" | "ai"
  conteudo: string
  created_at: string
}

export default function ConversasPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  useSubscriptionCheck()

  const { clinicData, setClinicData } = useClinic()

  const [clinicId, setClinicId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [uazapiStatus, setUazapiStatus] = useState("not_configured")

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

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

        // Carrega clinicData no contexto (igual no Leads)
        if (!clinicData?.id || clinicData.id !== profile.clinic_id) {
          const { data: clinic, error: clinicError } = await supabase
            .from("clinicas")
            .select("*")
            .eq("id", profile.clinic_id)
            .single()

          if (clinicError) throw clinicError

          // Mantém o mesmo comportamento do dashboard/leads
          if (clinic?.status_assinatura === "inativa") {
            router.push("/renovar-assinatura")
            return
          }

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

  const loadConversations = async (clinic: string) => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("session_id, quem_enviou, conteudo, created_at")
        .eq("clinic_id", clinic)
        .order("created_at", { ascending: false })
        .limit(400)

      if (error) throw error

      const map = new Map<string, Conversation>()

      for (const message of data || []) {
        if (!map.has(message.session_id)) {
          map.set(message.session_id, {
            sessionId: message.session_id,
            lastMessage: message.conteudo,
            lastSender: message.quem_enviou,
            lastAt: message.created_at,
          })
        }
      }

      const sessionIds = Array.from(map.keys())

      if (sessionIds.length) {
        const { data: leadsData, error: leadsError } = await supabase
          .from("leads")
          .select("telefone, nome")
          .in("telefone", sessionIds)

        if (leadsError) throw leadsError

        const leadMap = new Map<string, string>()
        for (const lead of leadsData || []) {
          leadMap.set(lead.telefone, lead.nome)
        }

        for (const conversation of map.values()) {
          conversation.leadName = leadMap.get(conversation.sessionId) || null
        }
      }

      const list = Array.from(map.values())
      setConversations(list)

      if (!selectedSessionId && list.length) {
        setSelectedSessionId(list[0].sessionId)
      }
    } catch (err) {
      logger.error("Erro ao carregar conversas:", err)
    } finally {
      setLoading(false)
    }
  }

  const apiBaseUrl = process.env.BACKEND_URL || ""

  const resolveUazapiStatus = (data: any) => {
    return (
      data?.status ||
      data?.instance?.status ||
      data?.instance?.state ||
      data?.state ||
      "unknown"
    )
  }

  const fetchUazapiStatus = async (clinic: string) => {
    if (!apiBaseUrl) return "error"
    try {
      const response = await fetch(`${apiBaseUrl}/uazapi/instance/status/${clinic}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.detail || "Erro ao consultar status")
      }
      const status = resolveUazapiStatus(data)
      setUazapiStatus(status)
      return status
    } catch (err) {
      logger.error("Erro ao buscar status Uazapi:", err)
      setUazapiStatus("error")
      return "error"
    }
  }

  useEffect(() => {
    if (!clinicId) {
      setLoading(false)
      return
    }

    const hydrateConversations = async () => {
      const status = await fetchUazapiStatus(clinicId)
      if (status !== "connected") {
        setConversations([])
        setSelectedSessionId(null)
        setLoading(false)
        return
      }
      loadConversations(clinicId)
    }

    hydrateConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId])

  useEffect(() => {
    const loadMessages = async () => {
      if (!clinicId || !selectedSessionId || uazapiStatus !== "connected") {
        setMessages([])
        return
      }

      setMessagesLoading(true)

      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("id, session_id, quem_enviou, conteudo, created_at")
          .eq("clinic_id", clinicId)
          .eq("session_id", selectedSessionId)
          .order("created_at", { ascending: true })

        if (error) throw error

        setMessages(data || [])
      } catch (err) {
        logger.error("Erro ao carregar mensagens:", err)
      } finally {
        setMessagesLoading(false)
      }
    }

    loadMessages()
  }, [clinicId, selectedSessionId, supabase, uazapiStatus])

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.sessionId === selectedSessionId) || null,
    [conversations, selectedSessionId]
  )

  if (authLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader clinicName={clinicData?.nome} onSignOut={handleSignOut} />

      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Conversas</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (!clinicId) return
                  fetchUazapiStatus(clinicId).then((status) => {
                    if (status === "connected") {
                      loadConversations(clinicId)
                    } else {
                      setConversations([])
                      setSelectedSessionId(null)
                    }
                  })
                }}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </CardHeader>

            <CardContent className="space-y-2">
              {loading ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : uazapiStatus !== "connected" ? (
                <div className="text-center text-muted-foreground py-10">
                  Instância WhatsApp não conectada
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                  Nenhuma conversa encontrada
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.sessionId}
                    type="button"
                    onClick={() => setSelectedSessionId(conversation.sessionId)}
                    className={cn(
                      "w-full rounded-lg border border-border/50 p-3 text-left transition hover:border-primary/40 hover:bg-muted/40",
                      selectedSessionId === conversation.sessionId && "border-primary/60 bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">
                        {conversation.leadName || "Contato sem nome"}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {conversation.lastSender === "user" ? "Paciente" : "IA"}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      {conversation.sessionId}
                    </div>

                    <div className="text-sm mt-2 line-clamp-2">{conversation.lastMessage}</div>

                    <div className="text-[11px] text-muted-foreground mt-2">
                      {conversation.lastAt
                        ? format(new Date(conversation.lastAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "-"}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Mensagens</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {selectedConversation?.leadName || selectedConversation?.sessionId || "Selecione"}
                </div>
              </div>
              <Badge variant={uazapiStatus === "connected" ? "default" : "secondary"}>
                {uazapiStatus === "connected"
                  ? "Conectado"
                  : uazapiStatus === "connecting"
                  ? "Conectando"
                  : uazapiStatus === "disconnected"
                  ? "Desconectado"
                  : uazapiStatus === "not_configured"
                  ? "Sem instância"
                  : uazapiStatus === "error"
                  ? "Erro"
                  : "Desconhecido"}
              </Badge>
            </CardHeader>
            <CardContent>
              {uazapiStatus !== "connected" ? (
                <div className="text-center text-muted-foreground py-16">
                  Nenhuma mensagem disponível
                </div>
              ) : messagesLoading ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  Nenhuma mensagem encontrada
                </div>
              ) : (
                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-2">
                  {messages.map((message) => {
                    const isUser = message.quem_enviou === "user"
                    return (
                      <div
                        key={message.id}
                        className={cn("flex", isUser ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                            isUser
                              ? "bg-emerald-500 text-white"
                              : "bg-muted text-foreground"
                          )}
                        >
                          <div>{message.conteudo}</div>
                          <div
                            className={cn(
                              "mt-1 text-[10px]",
                              isUser ? "text-emerald-50/80" : "text-muted-foreground"
                            )}
                          >
                            {format(new Date(message.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
