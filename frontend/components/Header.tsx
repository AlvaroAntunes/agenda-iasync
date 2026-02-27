"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Building2, Settings, Users, MessageSquare, CalendarDays, CreditCard, Menu, LogOut, LayoutDashboard, ClipboardList, BookOpen } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useState } from "react"
import { useClinic } from "@/app/contexts/ClinicContext"

type Props = {
  clinicName?: string | null
  onSignOut: () => Promise<void> | void
}

export function ClinicHeader({ clinicName, onSignOut }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const { clinicData } = useClinic()

  const isActive = (path: string) => pathname === path || pathname?.startsWith(`${path}/`)
  const hasCalendarConnected = Boolean(clinicData?.calendar_refresh_token)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl">
      <div className="w-full px-4 md:px-8 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/20 text-white group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {clinicName || "Carregando..."}
                </h1>
                <p className="text-sm text-slate-500">Dashboard</p>
              </div>
            </Link>

            {/* Middle: Nav */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              <Link href="/dashboard">
                <Button
                  variant={pathname === '/dashboard' ? "secondary" : "ghost"}
                  className={`gap-2 ${pathname === '/dashboard' ? 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' : 'text-slate-600'}`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>

              <Link href="/dashboard/leads">
                <Button
                  variant={isActive('/dashboard/leads') ? "secondary" : "ghost"}
                  className={`gap-2 ${isActive('/dashboard/leads') ? 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' : 'text-slate-600'}`}
                >
                  <Users className="h-4 w-4" />
                  Leads
                </Button>
              </Link>

              <Link href="/dashboard/conversas">
                <Button
                  variant={isActive('/dashboard/conversas') ? "secondary" : "ghost"}
                  className={`gap-2 ${isActive('/dashboard/conversas') ? 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' : 'text-slate-600'}`}
                >
                  <MessageSquare className="h-4 w-4" />
                  Conversas
                </Button>
              </Link>

              {hasCalendarConnected && (
                <Link href="/dashboard/agenda">
                  <Button
                    variant={isActive('/dashboard/agenda') ? "secondary" : "ghost"}
                    className={`gap-2 ${isActive('/dashboard/agenda') ? 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' : 'text-slate-600'} flex flex-col items-start p-3 h-auto`}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Agenda
                    </div>
                  </Button>
                </Link>
              )}

              <Link href="/dashboard/consultas">
                <Button
                  variant={isActive('/dashboard/consultas') ? "secondary" : "ghost"}
                  className={`gap-2 ${isActive('/dashboard/consultas') ? 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' : 'text-slate-600'}`}
                >
                  <ClipboardList className="h-4 w-4" />
                  Consultas
                </Button>
              </Link>

              <Link href="/dashboard/planos">
                <Button
                  variant={isActive('/dashboard/planos') ? "secondary" : "ghost"}
                  className={`gap-2 ${isActive('/dashboard/planos') ? 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' : 'text-slate-600'}`}
                >
                  <CreditCard className="h-4 w-4" />
                  Planos
                </Button>
              </Link>

              <Link href="/dashboard/tutorial">
                <Button
                  variant={isActive('/dashboard/tutorial') ? "secondary" : "ghost"}
                  className={`gap-2 ${isActive('/dashboard/tutorial') ? 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' : 'text-slate-600'}`}
                >
                  <BookOpen className="h-4 w-4" />
                  Tutorial
                </Button>
              </Link>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/dashboard/settings">
                <Button
                  variant={isActive('/dashboard/settings') ? "secondary" : "ghost"}
                  size="icon"
                  aria-label="Configurações"
                  className={isActive('/dashboard/settings') ? 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' : 'text-slate-600'}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>

              <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-100 gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você será desconectado da sua conta e precisará fazer login novamente para acessar o painel.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="hover:text-black">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={async () => {
                        await onSignOut()
                        router.push("/")
                      }}
                    >
                      Sim, quero sair
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Mobile Menu */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="-mr-2">
                    <Menu className="h-6 w-6 text-slate-700" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetTitle className="hidden">Menu de Navegação</SheetTitle>
                  <div className="flex flex-col gap-4 mt-6">
                    <Link href="/dashboard" className="flex items-center gap-3 mb-8 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/20 text-white">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <span className="font-bold text-slate-900 text-lg leading-tight">{clinicName || "Carregando..."}</span>
                    </Link>

                    <Link href="/dashboard">
                      <Button
                        variant={pathname === '/dashboard' ? "secondary" : "ghost"}
                        className={`w-full justify-start gap-2 h-12 ${pathname === '/dashboard' ? 'bg-cyan-50 text-cyan-700' : ''}`}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>

                    <Link href="/dashboard/leads">
                      <Button
                        variant={isActive('/dashboard/leads') ? "secondary" : "ghost"}
                        className={`w-full justify-start gap-2 h-12 ${isActive('/dashboard/leads') ? 'bg-cyan-50 text-cyan-700' : ''}`}
                      >
                        <Users className="h-4 w-4" />
                        Leads
                      </Button>
                    </Link>

                    <Link href="/dashboard/conversas">
                      <Button
                        variant={isActive('/dashboard/conversas') ? "secondary" : "ghost"}
                        className={`w-full justify-start gap-2 h-12 ${isActive('/dashboard/conversas') ? 'bg-cyan-50 text-cyan-700' : ''}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Conversas
                      </Button>
                    </Link>

                    {hasCalendarConnected && (
                      <Link href="/dashboard/agenda">
                        <Button
                          variant={isActive('/dashboard/agenda') ? "secondary" : "ghost"}
                          className={`w-full justify-start gap-2 h-16 ${isActive('/dashboard/agenda') ? 'bg-cyan-50 text-cyan-700' : ''} flex flex-col items-start p-3`}
                        >
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Agenda
                          </div>
                        </Button>
                      </Link>
                    )}

                    <Link href="/dashboard/consultas">
                      <Button
                        variant={isActive('/dashboard/consultas') ? "secondary" : "ghost"}
                        className={`w-full justify-start gap-2 h-12 ${isActive('/dashboard/consultas') ? 'bg-cyan-50 text-cyan-700' : ''}`}
                      >
                        <ClipboardList className="h-4 w-4" />
                        Consultas
                      </Button>
                    </Link>

                    <Link href="/dashboard/planos">
                      <Button
                        variant={isActive('/dashboard/planos') ? "secondary" : "ghost"}
                        className={`w-full justify-start gap-2 h-12 ${isActive('/dashboard/planos') ? 'bg-cyan-50 text-cyan-700' : ''}`}
                      >
                        <CreditCard className="h-4 w-4" />
                        Planos
                      </Button>
                    </Link>

                    <Link href="/dashboard/tutorial">
                      <Button
                        variant={isActive('/dashboard/tutorial') ? "secondary" : "ghost"}
                        className={`w-full justify-start gap-2 h-12 ${isActive('/dashboard/tutorial') ? 'bg-cyan-50 text-cyan-700' : ''}`}
                      >
                        <BookOpen className="h-4 w-4" />
                        Tutorial
                      </Button>
                    </Link>

                    <div className="h-px bg-slate-100 my-2" />

                    <Link href="/dashboard/settings">
                      <Button
                        variant={isActive('/dashboard/settings') ? "secondary" : "ghost"}
                        className={`w-full justify-start gap-2 h-12 ${isActive('/dashboard/settings') ? 'bg-cyan-50 text-cyan-700' : ''}`}
                      >
                        <Settings className="h-4 w-4" />
                        Configurações
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 h-12 text-slate-600 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setShowLogoutDialog(true)}
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
