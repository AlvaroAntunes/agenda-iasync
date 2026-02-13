"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { ClinicHeader } from "@/components/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { Loader2, RefreshCw, Pause, Play, Mic, Square, Plus } from "lucide-react"
import { ClinicLoading } from "@/components/ClinicLoading"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useSubscriptionCheck } from "@/lib/use-subscription-check"
import { logger } from "@/lib/logger"
import { useClinic } from "../../contexts/ClinicContext"
import { TrialBanner } from "@/components/TrialBanner"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { serverFetch } from "@/actions/api-proxy"

type Conversation = {
  sessionId: string
  lastMessage: string
  lastSender: "user" | "ai"
  lastAt: string
  leadName?: string | null
}

type ChatMediaType = "image" | "video" | "audio" | "file"

type ChatMedia = {
  type: ChatMediaType
  messageId?: string
  mimeType?: string
  fileName?: string
  caption?: string
  dataUrl?: string
}

type ChatMessage = {
  id: string
  session_id: string
  quem_enviou: "user" | "ai"
  conteudo: string
  created_at: string
  media?: ChatMedia | null
}

type LeadDetails = {
  id: string
  nome: string | null
  telefone: string
  status_ia: boolean
}

type TagItem = {
  id: string
  name: string
  color: string
}

type LeadOption = {
  id: string
  nome: string | null
  telefone: string
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
  const [replyText, setReplyText] = useState("")
  const [replyFile, setReplyFile] = useState<File | null>(null)
  const [replySending, setReplySending] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordChunksRef = useRef<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const [mediaCache, setMediaCache] = useState<Record<string, { url: string; mimeType?: string; fileName?: string }>>({})
  const mediaLoadingRef = useRef<Set<string>>(new Set())
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const [playingId, setPlayingId] = useState<string | null>(null)
  const messageCacheRef = useRef<Map<string, { messages: ChatMessage[]; updatedAt: number }>>(new Map())
  const hasInstanceToken = Boolean(clinicData?.uazapi_token)
  const displayUazapiStatus =
    uazapiStatus === "not_configured" && hasInstanceToken ? "disconnected" : uazapiStatus
  const [selectedLead, setSelectedLead] = useState<LeadDetails | null>(null)
  const [leadTags, setLeadTags] = useState<TagItem[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [leadInfoLoading, setLeadInfoLoading] = useState(false)
  const [leadIaUpdating, setLeadIaUpdating] = useState(false)
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([])
  const [newConversationOpen, setNewConversationOpen] = useState(false)
  const [newConversationMode, setNewConversationMode] = useState<"lead" | "number">("lead")
  const [selectedLeadId, setSelectedLeadId] = useState<string>("")
  const [newLeadName, setNewLeadName] = useState("")
  const [newLeadPhone, setNewLeadPhone] = useState("")
  const [initialMessage, setInitialMessage] = useState("")
  const [startingConversation, setStartingConversation] = useState(false)
  const tagsById = useMemo(() => {
    const map = new Map<string, TagItem>()
    tags.forEach((tag) => map.set(tag.id, tag))
    return map
  }, [tags])

  const mediaLabel = (type: ChatMediaType) => {
    if (type === "image") return "[imagem]"
    if (type === "video") return "[vídeo]"
    if (type === "audio") return "[áudio]"
    return "[arquivo]"
  }

  const conversationMediaLabel = (type: ChatMediaType) => {
    if (type === "audio") return "[audio]"
    return mediaLabel(type)
  }

  const isAudioLabel = (value: string) => {
    const normalized = value.trim().toLowerCase()
    return normalized === "[audio]" || normalized === "[áudio]"
  }

  const getConversationPreview = (raw: any) => {
    let displayContent = raw
    let isMedia = false
    if (typeof displayContent === "string") {
      const parsed = tryParseJson(displayContent)
      const isJsonString = parsed !== displayContent
      if (isJsonString && parsed && typeof parsed === "object") {
        const directType = (parsed as any)?.type
        if (directType && ["audio", "image", "video", "file"].includes(directType)) {
          displayContent = conversationMediaLabel(directType as ChatMediaType)
          isMedia = true
          return { displayContent, isMedia }
        }
        const media = extractMedia(parsed, parsed)
        if (media) {
          displayContent = conversationMediaLabel(media.type)
          isMedia = true
          return { displayContent, isMedia }
        }
      }
      if (!isMedia && isAudioLabel(displayContent)) {
        displayContent = conversationMediaLabel("audio")
        isMedia = true
      }
    }
    return { displayContent, isMedia }
  }

  const tryParseJson = (value: any) => {
    if (typeof value !== "string") return value
    const trimmed = value.trim()
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }

  const getMessageKey = (msg: Partial<ChatMessage>) => {
    if (msg.id) return String(msg.id)
    return [
      msg.created_at || "",
      msg.session_id || "",
      msg.quem_enviou || "",
      typeof msg.conteudo === "string" ? msg.conteudo : JSON.stringify(msg.conteudo || ""),
    ].join("|")
  }

  const inferMediaType = (value: any) => {
    if (!value) return null
    if (value?.audioMessage) return "audio" as ChatMediaType
    if (value?.imageMessage) return "image" as ChatMediaType
    if (value?.videoMessage) return "video" as ChatMediaType
    if (value?.documentMessage) return "file" as ChatMediaType
    const rawType = (
      value?.messageType ||
      value?.type ||
      value?.mimetype ||
      value?.mimeType ||
      value?.mediaType ||
      value?.contentType ||
      ""
    ).toString().toLowerCase()
    if (rawType.includes("image")) return "image" as ChatMediaType
    if (rawType.includes("video")) return "video" as ChatMediaType
    if (rawType.includes("audio")) return "audio" as ChatMediaType
    if (rawType.includes("document") || rawType.includes("file")) return "file" as ChatMediaType
    if (value?.JPEGThumbnail || value?.thumbnail || value?.thumb) return "image" as ChatMediaType
    if (value?.ptt === true) return "audio" as ChatMediaType
    return null
  }

  const extractMedia = (raw: any, msg: any): ChatMedia | null => {
    const candidates = [raw, msg, msg?.message, msg?.media, msg?.content].filter(Boolean)
    const mediaType =
      (candidates.map((candidate) => inferMediaType(candidate)).find(Boolean) as ChatMediaType | null) || null
    if (!mediaType) return null
    const pickFirst = (values: any[]) => values.find((value) => value !== undefined && value !== null)
    const caption = pickFirst([
      raw?.caption,
      raw?.text,
      raw?.message,
      raw?.content?.text,
      raw?.imageMessage?.caption,
      raw?.videoMessage?.caption,
      raw?.documentMessage?.caption,
      msg?.imageMessage?.caption,
      msg?.videoMessage?.caption,
      msg?.documentMessage?.caption,
      msg?.caption,
      msg?.text,
      msg?.message?.caption,
      msg?.message?.text,
      msg?.content?.caption,
      msg?.content?.text,
    ])
    const mimeType = pickFirst([
      raw?.mimetype,
      raw?.mimeType,
      raw?.contentType,
      raw?.audioMessage?.mimetype,
      raw?.imageMessage?.mimetype,
      raw?.videoMessage?.mimetype,
      raw?.documentMessage?.mimetype,
      msg?.mimetype,
      msg?.mimeType,
      msg?.contentType,
      msg?.audioMessage?.mimetype,
      msg?.imageMessage?.mimetype,
      msg?.videoMessage?.mimetype,
      msg?.documentMessage?.mimetype,
      msg?.message?.mimetype,
      msg?.message?.mimeType,
      msg?.message?.contentType,
      msg?.media?.mimetype,
      msg?.media?.mimeType,
    ])
    const fileName = pickFirst([
      raw?.fileName,
      raw?.filename,
      raw?.name,
      raw?.documentMessage?.fileName,
      msg?.fileName,
      msg?.filename,
      msg?.name,
      msg?.documentMessage?.fileName,
      msg?.message?.fileName,
      msg?.message?.filename,
      msg?.message?.name,
      msg?.media?.fileName,
      msg?.media?.filename,
      msg?.media?.name,
    ])
    const messageId = pickFirst([
      msg?.key?.id,
      msg?.message?.key?.id,
      msg?.messageid,
      msg?.messageId,
      msg?.message?.messageId,
      msg?.message?.id,
      msg?.id,
      raw?.messageId,
      raw?.id,
    ])
    const dataUrl = pickFirst([
      raw?.dataUrl,
      raw?.dataURL,
      msg?.dataUrl,
      msg?.dataURL,
      msg?.message?.dataUrl,
      msg?.message?.dataURL,
    ])
    return {
      type: mediaType,
      messageId,
      mimeType,
      fileName,
      caption: caption && typeof caption === "string" ? caption : undefined,
      dataUrl: dataUrl && typeof dataUrl === "string" ? dataUrl : undefined,
    }
  }

  const normalizeStoredMessage = (row: ChatMessage): ChatMessage => {
    const rawContent = row.conteudo
    const parsed = tryParseJson(rawContent)
    const isJsonString = typeof rawContent === "string" && parsed !== rawContent
    const media = isJsonString ? extractMedia(parsed, parsed) : null
    let content = row.conteudo
    if (media) {
      if (media.type === "audio") {
        content = mediaLabel("audio")
      } else {
        const caption = media.caption?.trim()
        content = caption || mediaLabel(media.type)
      }
    }
    return {
      ...row,
      conteudo: content,
      media: media || undefined,
    }
  }

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
        (payload: any) => {
          const newMessage = payload.new as ChatMessage & { clinic_id: string }
          if (!newMessage?.session_id) return
          const createdAtMs = new Date(newMessage.created_at).getTime()
          const preview = getConversationPreview(newMessage.conteudo)
          let displayContent = preview.displayContent
          let isMedia = preview.isMedia
          if (isMedia) {
            displayContent = String(displayContent)
          }

          setConversations((prev) => {
            const existing = prev.find((conversation) => conversation.sessionId === newMessage.session_id)
            const leadName = leadNameCacheRef.current.get(newMessage.session_id) ?? existing?.leadName ?? null
            const updated: Conversation = {
              sessionId: newMessage.session_id,
              lastMessage: displayContent,
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
              const normalizedMessage = normalizeStoredMessage(newMessage)
              const next = [...prev, normalizedMessage]
              next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              return next
            })
          }

          if (!leadNameCacheRef.current.has(newMessage.session_id)) {
            fetchLeadName(newMessage.session_id)
          }
        }
      )
      .subscribe((status: any) => {
        logger.info("Realtime chat_messages status:", { status, clinicId })
      })

    const leadsChannel = supabase
      .channel(`leads_${clinicId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads", filter: `clinic_id=eq.${clinicId}` },
        (payload: any) => {
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
        (payload: any) => {
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
      .subscribe((status: any) => {
        logger.info("Realtime leads status:", { status, clinicId })
      })

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(leadsChannel)
    }
  }, [clinicId, selectedSessionId, supabase, uazapiStatus])

  const loadConversations = useCallback(
    async (clinic: string, options?: { silent?: boolean }) => {
      const silent = options?.silent === true
      if (!silent) setLoading(true)

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
          if (!silent) setLoading(false)
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

        const map = new Map<string, Conversation & { _isMedia?: boolean; _lastAtMs?: number }>()

        for (const message of data || []) {
          const preview = getConversationPreview(message.conteudo)
          let displayContent = preview.displayContent
          let isMedia = preview.isMedia
          const createdAtMs = new Date(message.created_at).getTime()
          const existing = map.get(message.session_id)
          if (!existing) {
            map.set(message.session_id, {
              sessionId: message.session_id,
              lastMessage: displayContent,
              lastSender: message.quem_enviou,
              lastAt: message.created_at,
              _isMedia: isMedia,
              _lastAtMs: createdAtMs,
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
        if (!silent) setLoading(false)
      }
    },
    [selectedSessionId, supabase]
  )

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND ||
    ""

  const apiUrl = (path: string) => (apiBaseUrl ? `${apiBaseUrl}${path}` : path)

  const loadTags = useCallback(async () => {
    if (!clinicId) return
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, color")
        .eq("clinic_id", clinicId)
        .order("name", { ascending: true })
      if (error) {
        if ((error as any)?.code === "42P01") {
          setTags([])
          return
        }
        throw error
      }
      setTags((data || []) as TagItem[])
    } catch (err) {
      logger.error("Erro ao carregar tags:", err)
    }
  }, [clinicId, supabase])

  const loadLeadOptions = useCallback(async () => {
    if (!clinicId) return
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, nome, telefone")
        .eq("clinic_id", clinicId)
        .order("nome", { ascending: true })
      if (error) throw error
      setLeadOptions((data || []) as LeadOption[])
    } catch (err) {
      logger.error("Erro ao carregar leads:", err)
    }
  }, [clinicId, supabase])

  const ensureDefaultTags = useCallback(async () => {
    if (!clinicId) return
    const defaults = [
      { name: "Novo", color: "#22c55e" },
      { name: "Lead", color: "#0ea5e9" },
      { name: "Agendado", color: "#10b981" },
      { name: "Perdido", color: "#ef4444" },
    ]
    try {
      await supabase
        .from("tags")
        .upsert(
          defaults.map((item) => ({
            clinic_id: clinicId,
            name: item.name,
            color: item.color,
            is_system: true,
          })),
          { onConflict: "clinic_id,name" }
        )
      const { data } = await supabase
        .from("tags")
        .select("id, name, color")
        .eq("clinic_id", clinicId)
        .order("name", { ascending: true })
      setTags((data || []) as TagItem[])
    } catch (err) {
      logger.error("Erro ao criar tags padrão:", err)
    }
  }, [clinicId, supabase])

  const startNewConversation = async () => {
    if (!clinicId) return
    setStartingConversation(true)
    try {
      let phone = ""
      let leadId: string | null = null
      if (newConversationMode === "lead") {
        const lead = leadOptions.find((item) => item.id === selectedLeadId)
        if (!lead) {
          setStartingConversation(false)
          return
        }
        phone = lead.telefone
        leadId = lead.id
      } else {
        const raw = newLeadPhone.replace(/\D/g, "")
        if (!raw) {
          setStartingConversation(false)
          return
        }
        phone = raw
        const { data: existing } = await supabase
          .from("leads")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("telefone", raw)
          .limit(1)
        if (existing && existing.length) {
          leadId = existing[0].id
        } else {
          const { data: created, error } = await supabase
            .from("leads")
            .insert({
              clinic_id: clinicId,
              nome: newLeadName.trim() || "Sem nome",
              telefone: raw,
              lid: raw,
              status_ia: true,
            })
            .select("id")
            .single()
          if (error) throw error
          leadId = created?.id || null
          if (leadId) {
            await ensureDefaultTags()
            const { data: latestTags } = await supabase
              .from("tags")
              .select("id, name, color")
              .eq("clinic_id", clinicId)
            const novoTag = (latestTags || tags).find(
              (tag: any) => tag.name?.toLowerCase() === "novo"
            )
            const leadTag = (latestTags || tags).find(
              (tag: any) => tag.name?.toLowerCase() === "lead"
            )
            const tagIds = [novoTag?.id, leadTag?.id].filter(Boolean) as string[]
            if (tagIds.length) {
              await supabase.from("lead_tags").upsert(
                tagIds.map((tagId) => ({
                  clinic_id: clinicId,
                  lead_id: leadId!,
                  tag_id: tagId,
                })),
                { onConflict: "lead_id,tag_id" }
              )
            }
          }
          loadLeadOptions()
        }
      }

      setSelectedSessionId(phone)
      const selectedLeadName =
        newConversationMode === "lead"
          ? leadOptions.find((item) => item.id === selectedLeadId)?.nome || null
          : newLeadName.trim() || "Sem nome"
      setNewConversationOpen(false)
      setNewLeadName("")
      setNewLeadPhone("")
      setInitialMessage("")
      setSelectedLeadId("")

      if (initialMessage.trim()) {
        const payload = { type: "text", number: phone, text: initialMessage.trim() }
        const response = await serverFetch(apiUrl(`/uazapi/message/send/${clinicId}`), {
          method: "POST",
          body: payload,
        })
        const data = response.data
        if (!response.ok) {
          throw new Error(data?.detail || "Erro ao enviar mensagem")
        }
        const nowIso = new Date().toISOString()
        const optimistic: ChatMessage = {
          id: `local-${nowIso}`,
          session_id: phone,
          quem_enviou: "ai",
          conteudo: payload.text,
          created_at: nowIso,
        }
        setMessages((prev) => [...prev, optimistic])
        setConversations((prev) => {
          const existing = prev.find((conv) => conv.sessionId === phone)
          const updated: Conversation = {
            sessionId: phone,
            lastMessage: payload.text,
            lastSender: "ai",
            lastAt: nowIso,
            leadName: selectedLeadName,
          }
          const next = existing
            ? prev.map((conv) => (conv.sessionId === phone ? updated : conv))
            : [updated, ...prev]
          next.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
          return next
        })
      }
    } catch (err) {
      logger.error("Erro ao iniciar conversa:", err)
    } finally {
      setStartingConversation(false)
    }
  }

  const loadSelectedLead = useCallback(async () => {
    if (!clinicId || !selectedSessionId) {
      setSelectedLead(null)
      setLeadTags([])
      return
    }
    setLeadInfoLoading(true)
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, nome, telefone, status_ia")
        .eq("clinic_id", clinicId)
        .eq("telefone", selectedSessionId)
        .single()
      if (error || !data) {
        setSelectedLead(null)
        setLeadTags([])
        return
      }
      setSelectedLead(data as LeadDetails)
      const { data: tagData, error: tagError } = await supabase
        .from("lead_tags")
        .select("tag_id, tags(id, name, color)")
        .eq("lead_id", data.id)
      if (tagError) {
        if ((tagError as any)?.code === "42P01") {
          setLeadTags([])
          return
        }
        throw tagError
      }
      const mapped = (tagData || [])
        .map((row: any) => row.tags as TagItem | null)
        .filter(Boolean) as TagItem[]
      setLeadTags(mapped)
    } catch (err) {
      logger.error("Erro ao carregar lead:", err)
      setSelectedLead(null)
      setLeadTags([])
    } finally {
      setLeadInfoLoading(false)
    }
  }, [clinicId, selectedSessionId, supabase])

  const handleToggleLeadIA = async (nextValue: boolean) => {
    if (!selectedLead) return
    setLeadIaUpdating(true)
    setSelectedLead({ ...selectedLead, status_ia: nextValue })
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status_ia: nextValue })
        .eq("id", selectedLead.id)
      if (error) throw error
    } catch (err: any) {
      setSelectedLead({ ...selectedLead, status_ia: !nextValue })
      logger.error("Erro ao atualizar status_ia:", err)
    } finally {
      setLeadIaUpdating(false)
    }
  }

  const toggleLeadTag = async (tagId: string, checked: boolean) => {
    if (!clinicId || !selectedLead) return
    try {
      if (checked) {
        const { error } = await supabase
          .from("lead_tags")
          .insert({ clinic_id: clinicId, lead_id: selectedLead.id, tag_id: tagId })
        if (error) throw error
        const tag = tagsById.get(tagId)
        if (tag) setLeadTags((prev) => [...prev, tag])
      } else {
        const { error } = await supabase
          .from("lead_tags")
          .delete()
          .eq("lead_id", selectedLead.id)
          .eq("tag_id", tagId)
        if (error) throw error
        setLeadTags((prev) => prev.filter((tag) => tag.id !== tagId))
      }
    } catch (err) {
      logger.error("Erro ao atualizar tags do lead:", err)
    }
  }

  const getReplyPayload = async () => {
    if (!selectedSessionId) return null
    if (!replyFile) {
      const text = replyText.trim()
      if (!text) return null
      return { type: "text", number: selectedSessionId, text }
    }
    const reader = new FileReader()
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result || ""))
      reader.onerror = () => reject(new Error("Falha ao ler arquivo"))
      reader.readAsDataURL(replyFile)
    })
    const mimeType = replyFile.type || ""
    const type = mimeType.startsWith("image/")
      ? "image"
      : mimeType.startsWith("video/")
        ? "video"
        : mimeType.startsWith("audio/")
          ? "audio"
          : "file"
    return {
      type,
      number: selectedSessionId,
      media_base64: base64,
      mime_type: mimeType,
      file_name: replyFile.name,
      caption: replyText.trim() || undefined,
    }
  }

  const handleSendReply = async () => {
    if (!clinicId || !selectedSessionId || replySending) return
    setReplyError(null)
    try {
      const payload = await getReplyPayload()
      if (!payload) return
      setReplySending(true)
      const response = await serverFetch(apiUrl(`/uazapi/message/send/${clinicId}`), {
        method: "POST",
        body: payload,
      })
      const data = response.data
      if (!response.ok) {
        throw new Error(data?.detail || "Erro ao enviar mensagem")
      }
      const nowIso = new Date().toISOString()
      if (payload.type === "text") {
        const optimisticMessage: ChatMessage = {
          id: `local-${nowIso}`,
          session_id: selectedSessionId,
          quem_enviou: "ai",
          conteudo: payload.text || "",
          created_at: nowIso,
        }
        setMessages((prev) => [...prev, optimisticMessage])
      } else {
        const label = mediaLabel(payload.type as ChatMediaType)
        const optimisticMessage: ChatMessage = {
          id: `local-${nowIso}`,
          session_id: selectedSessionId,
          quem_enviou: "ai",
          conteudo: payload.caption || label,
          created_at: nowIso,
          media: {
            type: payload.type as ChatMediaType,
            mimeType: payload.mime_type,
            fileName: payload.file_name,
            caption: payload.caption,
            dataUrl: payload.media_base64,
          },
        }
        setMessages((prev) => [...prev, optimisticMessage])
      }
      setReplyText("")
      setReplyFile(null)
    } catch (err: any) {
      logger.error("Erro ao enviar resposta:", err)
      setReplyError(err?.message || "Erro ao enviar resposta")
    } finally {
      setReplySending(false)
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== "inactive") {
      recorder.stop()
    }
  }

  const startRecording = async () => {
    if (isRecording || replySending) return
    setReplyError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recordChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordChunksRef.current.push(event.data)
        }
      }
      recorder.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || "audio/webm" })
        const extension = blob.type.includes("ogg") ? "ogg" : "webm"
        const file = new File([blob], `audio_${Date.now()}.${extension}`, { type: blob.type })
        setReplyFile(file)
        setIsRecording(false)
        stream.getTracks().forEach((track) => track.stop())
      }
      recorder.onerror = () => {
        setIsRecording(false)
        stream.getTracks().forEach((track) => track.stop())
        setReplyError("Falha ao gravar áudio")
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (err) {
      setIsRecording(false)
      setReplyError("Permissão de microfone negada")
    }
  }

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
    try {
      const response = await serverFetch(apiUrl(`/uazapi/instance/status/${clinic}`))
      const data = response.data
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
      await fetchUazapiStatus(clinicId)
      loadConversations(clinicId)
    }

    hydrateConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId])

  useEffect(() => {
    if (!clinicId) return
    loadTags()
  }, [clinicId, loadTags])

  useEffect(() => {
    if (!clinicId) return
    loadLeadOptions()
  }, [clinicId, loadLeadOptions])

  useEffect(() => {
    loadSelectedLead()
  }, [loadSelectedLead])

  useEffect(() => {
    if (!clinicId) return
    if (typeof window === "undefined") return

    const baseUrl = apiBaseUrl || window.location.origin
    let sseUrl = baseUrl
    try {
      const url = new URL(baseUrl)
      url.pathname = `/sse/clinics/${clinicId}`
      sseUrl = url.toString()
    } catch (err) {
      logger.error("Erro ao montar URL SSE:", err)
      return
    }

    let eventSource: EventSource | null = null
    let reconnectTimer: NodeJS.Timeout | null = null

    const connect = () => {
      eventSource = new EventSource(sseUrl)
      eventSource.onopen = () => {
        logger.info("SSE conectado", { clinicId })
      }
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload?.type === "message" && payload.message) {
            const incoming = payload.message as ChatMessage
            const sessionId = incoming.session_id
            setConversations((prev) => {
              const existing = prev.find((conversation) => conversation.sessionId === sessionId)
              const leadName = leadNameCacheRef.current.get(sessionId) ?? existing?.leadName ?? null
              const updated: Conversation = {
                sessionId,
                lastMessage: incoming.conteudo,
                lastSender: incoming.quem_enviou,
                lastAt: incoming.created_at,
                leadName,
              }
              const next = existing
                ? prev.map((conversation) => (conversation.sessionId === sessionId ? updated : conversation))
                : [updated, ...prev]
              next.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
              return next
            })

            // Atualiza cache de mensagens por sessão para abrir instantâneo ao clicar.
            setTimeout(() => {
              const cached = messageCacheRef.current.get(sessionId)
              const base = cached?.messages ? [...cached.messages] : []
              const incomingKey = getMessageKey(incoming)
              if (!base.some((msg) => getMessageKey(msg) === incomingKey)) {
                base.push(incoming)
                base.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                const recent = base.slice(-50)
                messageCacheRef.current.set(sessionId, { messages: recent, updatedAt: Date.now() })
              }
            }, 0)

            if (selectedSessionId === sessionId) {
              setMessages((prev) => {
                const incomingKey = getMessageKey(incoming)
                if (prev.some((msg) => getMessageKey(msg) === incomingKey)) return prev
                const next = [...prev, incoming]
                next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                return next
              })
              setMessagesLoading(false)
            }
          }
          if (payload?.type === "lead" && payload.telefone) {
            leadNameCacheRef.current.set(payload.telefone, payload.nome ?? null)
            setConversations((prev) =>
              prev.map((conversation) =>
                conversation.sessionId === payload.telefone
                  ? { ...conversation, leadName: payload.nome ?? null }
                  : conversation
              )
            )
          }
        } catch (err) {
          logger.error("Erro ao processar SSE payload:", err)
        }
      }
      eventSource.onerror = (event) => {
        logger.warn("SSE desconectado", { clinicId, event })
        eventSource?.close()
        reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      eventSource?.close()
    }
  }, [clinicId, apiBaseUrl, selectedSessionId])

  const messagesLoadingRef = useRef(false)

  const loadMessages = useCallback(
    async (options?: { silent?: boolean; forceUazapi?: boolean }) => {
      if (!clinicId || !selectedSessionId) {
        setMessages([])
        return
      }
      if (messagesLoadingRef.current) return
      messagesLoadingRef.current = true

      const silent = options?.silent === true
      const cacheEntry = messageCacheRef.current.get(selectedSessionId)
      const now = Date.now()
      const cacheFresh = cacheEntry && now - cacheEntry.updatedAt < 20000
      const uazapiFresh = cacheEntry && now - cacheEntry.updatedAt < 8000
      const hasCache = Boolean(cacheEntry && cacheEntry.messages.length)

      if (hasCache) {
        setMessages(cacheEntry!.messages)
        if (!silent) setMessagesLoading(false)
        if (cacheFresh) {
          messagesLoadingRef.current = false
          return
        }
      } else if (!silent) {
        setMessagesLoading(true)
      }

      try {
        const targetSessionId = testChatId || selectedSessionId
        const shouldFetchUazapi = options?.forceUazapi ?? hasInstanceToken

        if (!shouldFetchUazapi) {
          // Carrega rápido do banco para reduzir delay ao trocar de conversa.
          const { data, error } = await supabase
            .from("chat_messages")
            .select("id, session_id, quem_enviou, conteudo, created_at")
            .eq("clinic_id", clinicId)
            .eq("session_id", selectedSessionId)
            .order("created_at", { ascending: false })
            .limit(50)

          if (error) throw error

          logger.info("Mensagens: histórico carregado", {
            clinic_id: clinicId,
            session_id: selectedSessionId,
            total: data?.length || 0,
          })
          const ordered = (data || []).slice().reverse().map((row: any) => normalizeStoredMessage(row))
          setMessages((prev) => {
            const map = new Map<string, ChatMessage>()
            for (const msg of ordered) map.set(msg.id, msg)
            for (const msg of prev) {
              if (!map.has(msg.id)) map.set(msg.id, msg)
            }
            const merged = Array.from(map.values())
            merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            const recent = merged.slice(-50)
            messageCacheRef.current.set(selectedSessionId, { messages: recent, updatedAt: Date.now() })
            return recent
          })
          if (!silent) setMessagesLoading(false)
        }

        if (shouldFetchUazapi && !uazapiFresh) {
          const chatId = targetSessionId.includes("@s.whatsapp.net")
            ? targetSessionId
            : `${targetSessionId}@s.whatsapp.net`
          const pageLimit = 50
          let offset = 0
          let allMessages: ChatMessage[] = []
          let isDescending: boolean | null = null
          let pageGuard = 0
          while (true) {
            const historyResponse = await serverFetch(apiUrl(`/uazapi/message/find/${clinicId}`), {
              method: "POST",
              body: {
                chatid: chatId,
                limit: pageLimit,
                offset,
              },
            })
            const historyRaw = historyResponse.data
            if (!historyResponse.ok) {
              logger.error("Uazapi history request error", {
                status: historyResponse.error,
                body: historyRaw,
                clinicId,
                sessionId: targetSessionId,
              })
            }
            let historyJson: any = null
            try {
              historyJson = historyRaw ? historyRaw : null
            } catch (parseError) {
              logger.error("Uazapi history parse error", parseError)
            }
            if (historyJson?.status === "error" || historyJson?.detail || historyJson?.error) {
              logger.error("Uazapi history response error", {
                status: historyResponse.error,
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
              status: historyResponse.error,
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
                const rawContent = msg?.text ?? msg?.content ?? msg?.message ?? ""
                const parsedContent = tryParseJson(rawContent)
                const isJsonString = typeof rawContent === "string" && parsedContent !== rawContent
                const media = extractMedia(parsedContent, msg)
                let content = ""
                if (media) {
                  if (media.type === "audio") {
                    content = mediaLabel("audio")
                  } else {
                    content = (media.caption && media.caption.trim()) || mediaLabel(media.type)
                  }
                } else if (typeof rawContent === "string" && (!isJsonString || parsedContent === rawContent)) {
                  content = rawContent
                }
                if (content && typeof content !== "string") {
                  content = JSON.stringify(content)
                }
                return {
                  id: msg?.id || `${chatId}-${offset}-${idx}`,
                  session_id: targetSessionId,
                  quem_enviou: msg?.fromMe ? "ai" : "user",
                  conteudo: content,
                  created_at: createdAt,
                  media,
                }
              })
              allMessages = allMessages.concat(mapped as ChatMessage[])
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
            messageCacheRef.current.set(selectedSessionId, { messages: recent, updatedAt: Date.now() })
            const lastMessage = recent[recent.length - 1]
            if (lastMessage) {
              const displayContent = lastMessage.media
                ? conversationMediaLabel(lastMessage.media.type)
                : lastMessage.conteudo
              setConversations((prev) =>
                prev.map((conversation) =>
                  conversation.sessionId === selectedSessionId
                    ? {
                      ...conversation,
                      lastMessage: displayContent,
                      lastSender: lastMessage.quem_enviou,
                      lastAt: lastMessage.created_at,
                    }
                    : conversation
                )
              )
            }
          }
        }
      } catch (err) {
        logger.error("Erro ao carregar mensagens:", err)
      } finally {
        if (!silent) setMessagesLoading(false)
        messagesLoadingRef.current = false
      }
    },
    [apiBaseUrl, clinicId, selectedSessionId, supabase, uazapiStatus, hasInstanceToken]
  )

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!clinicId) return
    const pending = messages.filter((message) => {
      if (!message.media?.messageId) return false
      if (message.media?.dataUrl) return false
      if (mediaCache[message.id]) return false
      if (mediaLoadingRef.current.has(message.id)) return false
      return true
    })
    if (pending.length === 0) return

    pending.forEach(async (message) => {
      if (!message.media?.messageId) return
      mediaLoadingRef.current.add(message.id)
      try {
        const response = await serverFetch(
          apiUrl(`/uazapi/message/download/${clinicId}?message_id=${message.media.messageId}`)
        )
        const data = response.data
        if (!response.ok) {
          throw new Error(data?.detail || "Erro ao baixar mídia")
        }
        const base64 = data?.base64
        if (!base64) throw new Error("Base64 não retornado")
        const mimeType = data?.mimetype || message.media?.mimeType
        const fileName = data?.file_name || message.media?.fileName
        const url = base64.startsWith("data:")
          ? base64
          : `data:${mimeType || "application/octet-stream"};base64,${base64}`
        setMediaCache((prev) => ({ ...prev, [message.id]: { url, mimeType, fileName } }))
      } catch (err) {
        logger.error("Erro ao baixar mídia", err)
      } finally {
        mediaLoadingRef.current.delete(message.id)
      }
    })
  }, [apiBaseUrl, clinicId, mediaCache, messages])

  useEffect(() => {
    if (messages.length === 0) return
    const lastId = messages[messages.length - 1]?.id || null
    if (!lastId || lastId === lastMessageIdRef.current) return
    lastMessageIdRef.current = lastId
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
  }, [messages])

  useEffect(() => {
    if (!clinicId) return
    const interval = setInterval(() => {
      loadConversations(clinicId, { silent: true })
    }, 1000)
    return () => clearInterval(interval)
  }, [clinicId, loadConversations])

  useEffect(() => {
    if (!clinicId || !selectedSessionId) return
    const interval = setInterval(() => {
      loadMessages({ silent: true })
    }, 1000)
    return () => clearInterval(interval)
  }, [clinicId, selectedSessionId, loadMessages])

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
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
          <Card className="h-full lg:order-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Conversas</CardTitle>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Button size="sm" onClick={() => setNewConversationOpen(true)} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova conversa
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (!clinicId) return
                    fetchUazapiStatus(clinicId).then(() => {
                      loadConversations(clinicId)
                    })
                  }}
                  disabled={loading}
                  className="self-end sm:self-auto"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-2">
              {displayUazapiStatus !== "connected" && (
                <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Instância WhatsApp não conectada. Exibindo histórico salvo.
                </div>
              )}
              {loading ? (
                <ClinicLoading message="Carregando conversas..." />
              ) : conversations.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                  Nenhuma conversa encontrada
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.sessionId}
                    type="button"
                    onClick={() => {
                      if (selectedSessionId === conversation.sessionId) return
                      const cached = messageCacheRef.current.get(conversation.sessionId)
                      if (cached?.messages?.length) {
                        setMessages(cached.messages)
                      }
                      setSelectedSessionId(conversation.sessionId)
                    }}
                    className={cn(
                      "w-full rounded-lg border border-border/50 p-3 text-left transition cursor-pointer",
                      selectedSessionId === conversation.sessionId && "border-primary/60 bg-muted",
                      selectedSessionId !== conversation.sessionId && "hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
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

          <Card className="h-full lg:order-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Mensagens</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {selectedConversation?.leadName || selectedConversation?.sessionId || "Selecione"}
                </div>
              </div>
              <Badge variant={displayUazapiStatus === "connected" ? "default" : "secondary"}>
                {displayUazapiStatus === "connected"
                  ? "Conectado"
                  : displayUazapiStatus === "connecting"
                    ? "Conectando"
                    : displayUazapiStatus === "disconnected"
                      ? "Desconectado"
                      : displayUazapiStatus === "not_configured"
                        ? "Sem instância"
                        : displayUazapiStatus === "error"
                          ? "Erro"
                          : "Desconhecido"}
              </Badge>
            </CardHeader>
            <CardContent>
              {displayUazapiStatus !== "connected" && (
                <div className="mb-4 rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Instância WhatsApp não conectada. Exibindo histórico salvo.
                </div>
              )}
              {messagesLoading ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  Nenhuma mensagem encontrada
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] sm:max-h-[520px] overflow-y-auto pr-1 sm:pr-2">
                  {messages.map((message) => {
                    const isAgent = message.quem_enviou === "ai"
                    const mediaUrl = message.media?.dataUrl || mediaCache[message.id]?.url
                    const mediaFileName = message.media?.fileName || mediaCache[message.id]?.fileName
                    const mediaMimeType = message.media?.mimeType || mediaCache[message.id]?.mimeType
                    return (
                      <div
                        key={message.id}
                        className={cn("flex", isAgent ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                            isAgent
                              ? "bg-emerald-500 text-white"
                              : "bg-muted text-foreground"
                          )}
                        >
                          {message.media ? (
                            <div className="space-y-2">
                              {message.media.type === "image" && mediaUrl && (
                                <img
                                  src={mediaUrl}
                                  alt={message.media.caption || "Imagem recebida"}
                                  className="max-h-64 rounded-md object-contain"
                                />
                              )}
                              {message.media.type === "video" && mediaUrl && (
                                <video
                                  controls
                                  src={mediaUrl}
                                  className="max-h-64 w-full rounded-md"
                                />
                              )}
                              {message.media.type === "audio" && mediaUrl && (
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    className={cn(
                                      "flex h-10 w-10 items-center justify-center rounded-full transition",
                                      isAgent ? "bg-emerald-600/90 text-white" : "bg-foreground/10 text-foreground"
                                    )}
                                    onClick={() => {
                                      const el = audioRefs.current.get(message.id)
                                      if (!el) return
                                      if (playingId && playingId !== message.id) {
                                        const current = audioRefs.current.get(playingId)
                                        current?.pause()
                                      }
                                      if (el.paused) {
                                        el.play().catch(() => null)
                                        setPlayingId(message.id)
                                      } else {
                                        el.pause()
                                        setPlayingId(null)
                                      }
                                    }}
                                  >
                                    {playingId === message.id ? (
                                      <Pause className="h-4 w-4" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                  </button>
                                  <div className="flex flex-col">
                                    <div className="text-xs font-medium">
                                      Áudio recebido
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      Toque para ouvir
                                    </div>
                                  </div>
                                  <audio
                                    ref={(el) => {
                                      if (el) audioRefs.current.set(message.id, el)
                                      else audioRefs.current.delete(message.id)
                                    }}
                                    src={mediaUrl}
                                    onEnded={() => setPlayingId((prev) => (prev === message.id ? null : prev))}
                                  />
                                </div>
                              )}
                              {message.media.type === "file" && mediaUrl && (
                                <a
                                  className="text-xs underline"
                                  href={mediaUrl}
                                  download={mediaFileName || "arquivo"}
                                >
                                  Baixar arquivo
                                </a>
                              )}
                              {!mediaUrl && (
                                <div className="text-xs text-muted-foreground">
                                  Carregando mídia...
                                </div>
                              )}
                              {message.conteudo && message.conteudo !== mediaLabel(message.media.type) && (
                                <div>{message.conteudo}</div>
                              )}
                            </div>
                          ) : (
                            <div>{message.conteudo}</div>
                          )}
                          <div
                            className={cn(
                              "mt-1 text-[10px]",
                              isAgent ? "text-emerald-50/80" : "text-muted-foreground"
                            )}
                          >
                            {format(new Date(message.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
              {uazapiStatus === "connected" && (
                <div className="mt-4 border-t border-border/70 pt-3">
                  <div className="flex items-center gap-2">
                    <label
                      className={cn(
                        "rounded-lg border border-border/70 px-3 py-2 text-xs text-muted-foreground transition",
                        replySending || isRecording ? "opacity-60" : "cursor-pointer hover:border-primary/60"
                      )}
                    >
                      Anexo
                      <input
                        type="file"
                        accept="image/*,video/*,audio/*"
                        className="hidden"
                        disabled={replySending || isRecording}
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null
                          setReplyFile(file)
                        }}
                      />
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant={isRecording ? "destructive" : "outline"}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={replySending || !selectedSessionId}
                      className="gap-2"
                    >
                      {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      {isRecording ? "Parar" : "Gravar"}
                    </Button>
                    <div className="flex-1">
                      <input
                        className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60"
                        placeholder="Digite uma mensagem..."
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        disabled={replySending || !selectedSessionId}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault()
                            handleSendReply()
                          }
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSendReply}
                      disabled={replySending || !selectedSessionId || (!replyText.trim() && !replyFile)}
                    >
                      {replySending ? "Enviando..." : "Enviar"}
                    </Button>
                  </div>
                  {replyFile && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Anexo: {replyFile.name}
                    </div>
                  )}
                  {isRecording && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Gravando áudio...
                    </div>
                  )}
                  {replyError && (
                    <div className="mt-2 text-xs text-red-500">{replyError}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-full lg:order-3">
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedConversation ? (
                <>
                  <div>
                    <div className="text-sm text-muted-foreground">Nome</div>
                    <div className="text-base font-semibold">
                      {selectedLead?.nome || selectedConversation.leadName || "Contato sem nome"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Telefone</div>
                    <div className="text-base">{selectedConversation.sessionId}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">IA para este contato</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedLead?.status_ia ? "Ativada" : "Desativada"}
                      </div>
                    </div>
                    <Switch
                      className="cursor-pointer"
                      checked={Boolean(selectedLead?.status_ia)}
                      onCheckedChange={(checked) => handleToggleLeadIA(checked)}
                      disabled={!selectedLead || leadIaUpdating || leadInfoLoading}
                    />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {leadTags.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Sem tags</span>
                      ) : (
                        leadTags.map((tag) => (
                          <Badge
                            key={tag.id}
                            style={{ backgroundColor: tag.color, color: "#ffffff" }}
                          >
                            {tag.name}
                          </Badge>
                        ))
                      )}
                    </div>
                    {tags.length > 0 && selectedLead && (
                      <div className="mt-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Editar tags
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {tags.map((tag) => {
                              const isChecked = leadTags.some((leadTag) => leadTag.id === tag.id)
                              return (
                                <DropdownMenuCheckboxItem
                                  key={tag.id}
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    toggleLeadTag(tag.id, Boolean(checked))
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
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Selecione uma conversa</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova conversa</DialogTitle>
              <DialogDescription>
                Inicie uma conversa com um lead existente ou um número específico.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2">
                <span className="text-sm text-muted-foreground">Tipo</span>
                <Select
                  value={newConversationMode}
                  onValueChange={(value) =>
                    setNewConversationMode(value as "lead" | "number")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newConversationMode === "lead" ? (
                <div className="grid gap-2">
                  <span className="text-sm text-muted-foreground">Selecione o lead</span>
                  <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadOptions.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.nome || "Sem nome"} • {lead.telefone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    <span className="text-sm text-muted-foreground">Nome (opcional)</span>
                    <Input
                      value={newLeadName}
                      onChange={(event) => setNewLeadName(event.target.value)}
                      placeholder="Ex: Maria Souza"
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm text-muted-foreground">Número</span>
                    <Input
                      value={newLeadPhone}
                      onChange={(event) => setNewLeadPhone(event.target.value)}
                      placeholder="5511999999999"
                    />
                  </div>
                </>
              )}

              <div className="grid gap-2">
                <span className="text-sm text-muted-foreground">Mensagem inicial (opcional)</span>
                <Input
                  value={initialMessage}
                  onChange={(event) => setInitialMessage(event.target.value)}
                  placeholder="Digite a primeira mensagem..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewConversationOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={startNewConversation}
                disabled={
                  startingConversation ||
                  (newConversationMode === "lead" && !selectedLeadId) ||
                  (newConversationMode === "number" && !newLeadPhone.trim())
                }
              >
                {startingConversation ? "Iniciando..." : "Iniciar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
