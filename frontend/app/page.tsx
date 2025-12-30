import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Building2, 
  Bot, 
  Calendar, 
  MessageSquare, 
  Clock, 
  Users, 
  CheckCircle2,
  Sparkles,
  ArrowRight
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 md:px-8 lg:px-8">
          <div className="flex h-16 items-center justify-between max-w-full">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">IASync</span>
            </div>
            <Link href="/login/clinic">
              <Button>Acessar Sistema</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32 max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Gestão Inteligente com IA</span>
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Transforme sua Clínica com{" "}
            <span className="text-primary">Inteligência Artificial</span>
          </h1>
          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            Sistema completo de gestão de clínicas com agendamento automatizado via WhatsApp, 
            atendimento inteligente por IA e controle total de consultas e pacientes.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/login/clinic">
              <Button size="lg" className="w-full sm:w-auto">
                Começar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Conhecer Recursos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16 md:py-24 max-w-7xl">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Recursos Principais</h2>
            <p className="text-lg text-muted-foreground">
              Tudo que você precisa para gerenciar sua clínica com eficiência
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Bot className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Atendimento por IA</CardTitle>
                <CardDescription>
                  Bot inteligente no WhatsApp responde dúvidas e agenda consultas automaticamente
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Agendamento Inteligente</CardTitle>
                <CardDescription>
                  Sistema automatizado que gerencia horários e evita conflitos de agenda
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Integração WhatsApp</CardTitle>
                <CardDescription>
                  Comunicação direta com pacientes pela plataforma mais usada no Brasil
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Lembretes Automáticos</CardTitle>
                <CardDescription>
                  Reduza faltas com notificações automáticas antes das consultas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-pink-100">
                  <Users className="h-6 w-6 text-pink-600" />
                </div>
                <CardTitle>Gestão de Pacientes</CardTitle>
                <CardDescription>
                  Histórico completo de consultas e informações dos pacientes centralizadas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-100">
                  <Building2 className="h-6 w-6 text-cyan-600" />
                </div>
                <CardTitle>Multi-clínicas</CardTitle>
                <CardDescription>
                  Gerencie múltiplas clínicas e equipes em uma única plataforma
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 max-w-7xl">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Por que escolher IASync?</h2>
            <p className="text-lg text-muted-foreground">
              Benefícios comprovados para sua clínica
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex gap-4">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <h3 className="mb-2 font-semibold">Redução de Faltas</h3>
                <p className="text-muted-foreground">
                  Lembretes automáticos reduzem em até 70% as faltas em consultas
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <h3 className="mb-2 font-semibold">Economia de Tempo</h3>
                <p className="text-muted-foreground">
                  Automação libera sua equipe para focar no atendimento ao paciente
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <h3 className="mb-2 font-semibold">Atendimento 24/7</h3>
                <p className="text-muted-foreground">
                  IA responde pacientes a qualquer hora, mesmo fora do expediente
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <h3 className="mb-2 font-semibold">Fácil de Usar</h3>
                <p className="text-muted-foreground">
                  Interface intuitiva que sua equipe aprende em minutos
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 max-w-7xl">
        <div className="mx-auto max-w-4xl">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
              <h2 className="text-3xl font-bold md:text-4xl">
                Pronto para modernizar sua clínica?
              </h2>
              <p className="text-lg text-muted-foreground">
                Entre em contato e descubra como podemos ajudar sua clínica a crescer
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href="/login/clinic">
                  <Button size="lg" className="w-full sm:w-auto">
                    Acessar Sistema
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                  <a href="mailto:contato@iasync.com.br">Entre em Contato</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-auto">
        <div className="w-full px-4 md:px-8 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">IASync</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 IASync. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
