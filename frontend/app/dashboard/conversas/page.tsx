"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { ClinicHeader } from "@/components/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2, RefreshCw } from "lucide-react"
import { ClinicLoading } from "@/components/ClinicLoading"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useSubscriptionCheck } from "@/lib/use-subscription-check"
import { logger } from "@/lib/logger"
import { useClinic } from "../../contexts/ClinicContext"
import { TrialBanner } from "@/components/TrialBanner"

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
  const testChatId: string | null = null
  const leadNameCacheRef = useRef<Map<string, string | null>>(new Map())

  const normalizeUazapiTimestamp = (value: any) => {
    if (!value) return new Date().toISOString()
    if (typeof value === "string") {
      const numeric = Number(value)
      if (!Number.isNaN(numeric)) {
        const ms = value.length <= 10 ? numeric * 1000 : numeric
        return new Date(ms).toISOString()
      }
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
    }
    if (typeof value === "number") {
      const ms = value < 1e11 ? value * 1000 : value
      return new Date(ms).toISOString()
    }
    return new Date().toISOString()
  }

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
  }, [router])

  useEffect(() => {
    if (!clinicId) return

    const fetchLeadName = async (sessionId: string) => {
      if (leadNameCacheRef.current.has(sessionId)) return
      try {
        const { data, error } = await supabase
          .from("leads")
          .select("nome")
          .eq("clinic_id", clinicId)
          .eq("telefone", sessionId)
          .single()
        if (error) throw error
        const nome = data?.nome ?? null
        leadNameCacheRef.current.set(sessionId, nome)
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.sessionId === sessionId
              ? { ...conversation, leadName: nome }
              : conversation
          )
        )
      } catch (err) {
        logger.error("Erro ao buscar lead para conversa:", err)
      }
    }

    const messagesChannel = supabase
      .channel(`chat_messages_${clinicId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `clinic_id=eq.${clinicId}` },
        (payload) => {
          const newMessage = payload.new as ChatMessage & { clinic_id: string }
          if (!newMessage?.session_id) return

          setConversations((prev) => {
            const existing = prev.find((conversation) => conversation.sessionId === newMessage.session_id)
            const leadName = leadNameCacheRef.current.get(newMessage.session_id) ?? existing?.leadName ?? null
            const updated: Conversation = {
              sessionId: newMessage.session_id,
              lastMessage: newMessage.conteudo,
              lastSender: newMessage.quem_enviou,
              lastAt: newMessage.created_at,
              leadName,
            }
            const next = existing
              ? prev.map((conversation) =>
                  conversation.sessionId === newMessage.session_id ? updated : conversation
                )
              : [updated, ...prev]
            next.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
            return next
          })

          if (!selectedSessionId) {
            setSelectedSessionId(newMessage.session_id)
          }

          if (selectedSessionId === newMessage.session_id) {
            setMessages((prev) => {
              if (prev.some((msg) => msg.id === newMessage.id)) return prev
              const next = [...prev, newMessage]
              next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              return next
            })
          }

          if (!leadNameCacheRef.current.has(newMessage.session_id)) {
            fetchLeadName(newMessage.session_id)
          }
        }
      )
      .subscribe()

    const leadsChannel = supabase
      .channel(`leads_${clinicId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads", filter: `clinic_id=eq.${clinicId}` },
        (payload) => {
          const lead = payload.new as { telefone?: string | null; nome?: string | null }
          if (!lead?.telefone) return
          leadNameCacheRef.current.set(lead.telefone, lead.nome ?? null)
          setConversations((prev) =>
            prev.map((conversation) =>
              conversation.sessionId === lead.telefone
                ? { ...conversation, leadName: lead.nome ?? null }
                : conversation
            )
          )
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads", filter: `clinic_id=eq.${clinicId}` },
        (payload) => {
          const lead = payload.new as { telefone?: string | null; nome?: string | null }
          if (!lead?.telefone) return
          leadNameCacheRef.current.set(lead.telefone, lead.nome ?? null)
          setConversations((prev) =>
            prev.map((conversation) =>
              conversation.sessionId === lead.telefone
                ? { ...conversation, leadName: lead.nome ?? null }
                : conversation
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(leadsChannel)
    }
  }, [clinicId, selectedSessionId, supabase])

  const loadConversations = async (clinic: string) => {
    setLoading(true)

    try {
      if (testChatId) {
        const list = [
          {
            sessionId: testChatId,
            lastMessage: "Teste Uazapi",
            lastSender: "user" as const,
            lastAt: new Date().toISOString(),
            leadName: null,
          },
        ]
        setConversations(list)
        if (!selectedSessionId) {
          setSelectedSessionId(testChatId)
        }
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("chat_messages")
        .select("session_id, quem_enviou, conteudo, created_at")
        .eq("clinic_id", clinic)
        .order("created_at", { ascending: false })
        .limit(400)

      if (error) throw error
      logger.info("Conversas: mensagens carregadas", {
        clinic_id: clinic,
        total: data?.length || 0,
      })

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
      list.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
      logger.info("Conversas: sessões agregadas", {
        clinic_id: clinic,
        total: list.length,
      })
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

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND ||
    process.env.BACKEND_URL ||
    ""

  const resolveUazapiStatus = (data: any) => {
    if (data?.status?.connected === true || data?.status?.loggedIn === true) {
      return "connected"
    }
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
        const targetSessionId = testChatId || selectedSessionId
        const chatId = targetSessionId.includes("@s.whatsapp.net")
          ? targetSessionId
          : `${targetSessionId}@s.whatsapp.net`
        const pageLimit = 50
        let offset = 0
        let allMessages: ChatMessage[] = []
        let isDescending: boolean | null = null
        let pageGuard = 0
        while (true) {
          const historyResponse = await fetch(`${apiBaseUrl}/uazapi/message/find/${clinicId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chatid: chatId,
              limit: pageLimit,
              offset,
            }),
          })
          const historyRaw = await historyResponse.text()
          if (!historyResponse.ok) {
            logger.error("Uazapi history request error", {
              status: historyResponse.status,
              body: historyRaw,
              clinicId,
              sessionId: targetSessionId,
            })
          }
          let historyJson: any = null
          try {
            historyJson = historyRaw ? JSON.parse(historyRaw) : null
          } catch (parseError) {
            logger.error("Uazapi history parse error", parseError)
          }
          if (historyJson?.status === "error" || historyJson?.detail || historyJson?.error) {
            logger.error("Uazapi history response error", {
              status: historyResponse.status,
              response: historyJson,
              clinicId,
              sessionId: targetSessionId,
            })
          }
          let oldestTs: string | null = null
          let newestTs: string | null = null
          if (historyJson?.messages && Array.isArray(historyJson.messages)) {
            for (const msg of historyJson.messages) {
              const ts = normalizeUazapiTimestamp(
                msg?.messageTimestamp ||
                  msg?.timestamp ||
                  msg?.created_at ||
                  msg?.createdAt ||
                  msg?.t ||
                  msg?.time
              )
              if (!oldestTs || ts < oldestTs) oldestTs = ts
              if (!newestTs || ts > newestTs) newestTs = ts
            }
          }
          logger.info("Uazapi history raw", {
            status: historyResponse.status,
            body: historyRaw,
            oldestTs,
            newestTs,
          })

          if (!historyJson) break

          const historyList =
            historyJson?.messages ||
            historyJson?.data?.messages ||
            historyJson?.data ||
            historyJson?.items ||
            []
          if (Array.isArray(historyList) && historyList.length) {
            if (isDescending === null) {
              const firstTs = normalizeUazapiTimestamp(
                historyList[0]?.messageTimestamp ||
                  historyList[0]?.timestamp ||
                  historyList[0]?.created_at ||
                  historyList[0]?.createdAt ||
                  historyList[0]?.t ||
                  historyList[0]?.time
              )
              const lastTs = normalizeUazapiTimestamp(
                historyList[historyList.length - 1]?.messageTimestamp ||
                  historyList[historyList.length - 1]?.timestamp ||
                  historyList[historyList.length - 1]?.created_at ||
                  historyList[historyList.length - 1]?.createdAt ||
                  historyList[historyList.length - 1]?.t ||
                  historyList[historyList.length - 1]?.time
              )
              isDescending = firstTs >= lastTs
              logger.info("Uazapi history order", {
                order: isDescending ? "desc" : "asc",
                firstTs,
                lastTs,
              })
            }
            const mapped = historyList.map((msg: any, idx: number) => {
              const createdAt = normalizeUazapiTimestamp(
                msg?.messageTimestamp ||
                  msg?.timestamp ||
                  msg?.created_at ||
                  msg?.createdAt ||
                  msg?.t ||
                  msg?.time
              )
              let content = msg?.text || msg?.content || msg?.message || ""
              if (content && typeof content !== "string") {
                content = JSON.stringify(content)
              }
              return {
                id: msg?.id || `${chatId}-${offset}-${idx}`,
                session_id: targetSessionId,
                quem_enviou: msg?.fromMe ? "ai" : "user",
                conteudo: content,
                created_at: createdAt,
              }
            })
            allMessages = allMessages.concat(mapped)
            if (allMessages.length > pageLimit * 2) {
              allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              allMessages = allMessages.slice(-pageLimit)
            }
          }

          const nextOffset = Number(historyJson?.nextOffset)
          const hasMore = historyJson?.hasMore === true
          if (isDescending && allMessages.length >= pageLimit) {
            break
          }
          if ((Number.isNaN(nextOffset) || nextOffset === offset) && !hasMore) {
            break
          }
          if (!Number.isNaN(nextOffset) && nextOffset !== offset) {
            offset = nextOffset
            pageGuard += 1
            if (pageGuard > 200) break
            continue
          }
          if (!hasMore) break
        }

        if (allMessages.length) {
          allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          const recent = allMessages.slice(-pageLimit)
          setMessages(recent)
          setMessagesLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("chat_messages")
          .select("id, session_id, quem_enviou, conteudo, created_at")
          .eq("clinic_id", clinicId)
          .eq("session_id", selectedSessionId)
          .order("created_at", { ascending: true })

        if (error) throw error

        logger.info("Mensagens: histórico carregado", {
          clinic_id: clinicId,
          session_id: selectedSessionId,
          total: data?.length || 0,
        })
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
    return <ClinicLoading />
  }

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader clinicName={clinicData?.nome} onSignOut={handleSignOut} />

      <main className="container mx-auto px-6 py-8">
        {clinicData?.id && (
          <TrialBanner clinicId={clinicData.id} blockAccess={false} />
        )}
        <div className="grid gap-4 grid-cols-[320px_minmax(0,1fr)_320px]">
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
                <ClinicLoading message="Carregando conversas..." />
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

          <Card className="h-full">
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedConversation ? (
                <>
                  <div>
                    <div className="text-sm text-muted-foreground">Nome</div>
                    <div className="text-base font-semibold">
                      {selectedConversation.leadName || "Contato sem nome"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Telefone</div>
                    <div className="text-base">{selectedConversation.sessionId}</div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Selecione uma conversa</div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
