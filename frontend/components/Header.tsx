"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Building2, Settings, Users, MessageSquare, CalendarDays } from "lucide-react"

type Props = {
  clinicName?: string | null
  onSignOut: () => Promise<void> | void
}

export function ClinicHeader({ clinicName, onSignOut }: Props) {
  const router = useRouter()

  return (
    <header className="border-b bg-card">
      <div className="w-full px-4 md:px-8 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>

              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {clinicName || "Carregando..."}
                </h1>
                <p className="text-sm text-muted-foreground">Dashboard</p>
              </div>
            </Link>

            {/* Middle: Nav */}
            <nav className="hidden md:flex items-center gap-2">
              <Link href="/dashboard/leads">
                <Button variant="ghost" className="gap-2">
                  <Users className="h-4 w-4" />
                  Leads
                </Button>
              </Link>

              <Link href="/dashboard/conversas">
                <Button variant="ghost" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Conversas
                </Button>
              </Link>

              <Link href="#">
                <Button variant="ghost" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Calendário
                </Button>
              </Link>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard/settings">
              <Button variant="outline" size="icon" aria-label="Configurações">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={async () => {
                await onSignOut()
                router.push("/")
              }}
            >
              Sair
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="mt-3 flex md:hidden items-center gap-2 overflow-x-auto">
          <Link href="/dashboard/leads">
            <Button variant="ghost" className="gap-2 whitespace-nowrap">
              <Users className="h-4 w-4" />
              Leads
            </Button>
          </Link>

          <Link href="/dashboard/conversas">
            <Button variant="ghost" className="gap-2 whitespace-nowrap">
              <MessageSquare className="h-4 w-4" />
              Conversas
            </Button>
          </Link>

          <Link href="#">
            <Button variant="ghost" className="gap-2 whitespace-nowrap">
              <CalendarDays className="h-4 w-4" />
              Calendário
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
