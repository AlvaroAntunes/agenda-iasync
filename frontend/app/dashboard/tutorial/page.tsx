"use client"

import { useRouter } from "next/navigation"
import { BookOpen, Calendar, MessageSquare, ArrowRight, Smartphone, QrCode, CheckCircle2, ExternalLink, Shield, MonitorSmartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ClinicHeader } from "@/components/Header"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { useClinic } from "@/app/contexts/ClinicContext"
import Image from "next/image"

export default function TutorialPage() {
    const router = useRouter()
    const supabase = getSupabaseBrowserClient()
    const { clinicData } = useClinic()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            {/* Background Decorativo */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-100/40 rounded-full blur-3xl" />
                <div className="absolute top-1/3 -left-20 w-60 h-60 bg-blue-100/30 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-100/20 rounded-full blur-3xl" />
            </div>

            <ClinicHeader clinicName={clinicData?.nome} onSignOut={handleSignOut} />

            <main className="w-full px-4 md:px-8 lg:px-12 py-8 space-y-8 relative z-10 max-w-5xl mx-auto">
                {/* Page Header */}
                <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 border border-white/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-600 via-blue-600 to-emerald-600" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 flex-shrink-0">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Tutorial</h1>
                            <p className="text-slate-500 text-sm">Passo a passo para configurar sua clínica</p>
                        </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                        Siga os tutoriais abaixo para conectar seu <strong>Google Calendar</strong> e seu <strong>WhatsApp</strong> à plataforma.
                        Assim, a IA poderá gerenciar seus agendamentos automaticamente.
                    </p>
                </div>

                {/* ========================================== */}
                {/* TUTORIAL 1: Google Calendar */}
                {/* ========================================== */}
                <div className="bg-white rounded-3xl p-3 sm:p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-white/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-600" />

                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Conectar ao Google Calendar</h2>
                            <p className="text-slate-500 text-sm">Vincule seu calendário para gerenciar agendamentos</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Step 1 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                                <div className="w-0.5 flex-1 bg-blue-200 mt-2" />
                            </div>
                            <div className="pb-8 flex-1">
                                <h3 className="font-semibold text-slate-900 text-lg mb-2">Acesse o Dashboard</h3>
                                <p className="text-slate-600 text-sm mb-4">
                                    Faça login na plataforma e acesse o Dashboard principal. Você verá o card de resumo com os botões de ação.
                                </p>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                                    <Image
                                        src="/dashboard-tela.png"
                                        alt="Dashboard"
                                        width={1200}
                                        height={700}
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                                <div className="w-0.5 flex-1 bg-blue-200 mt-2" />
                            </div>
                            <div className="pb-8 flex-1">
                                <h3 className="font-semibold text-slate-900 text-lg mb-2">Clique em &quot;Conectar calendário&quot;</h3>
                                <p className="text-slate-600 text-sm mb-4">
                                    No card principal do Dashboard, localize o botão <strong>&quot;Conectar calendário&quot;</strong> e clique nele.
                                    Você será redirecionado para a tela de autorização do Google.
                                </p>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                                    <Image
                                        src="/dashboard-calendario.png"
                                        alt="Dashboard"
                                        width={1200}
                                        height={700}
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                                <div className="w-0.5 flex-1 bg-blue-200 mt-2" />
                            </div>
                            <div className="pb-8 flex-1">
                                <h3 className="font-semibold text-slate-900 text-lg mb-2">Autorize o acesso no Google</h3>
                                <p className="text-slate-600 text-sm mb-4">
                                    Na tela de login do Google, selecione a conta que deseja vincular. Como não obtivemos a verificação do google ainda, clique em "Avançado" e depois em "Acessar Agenda IAsync (não seguro)".
                                    Permita todas as permissões solicitadas para que a IA possa gerenciar sua agenda.
                                </p>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                                    <Image
                                        src="/google-verificacao.png"
                                        alt="Dashboard"
                                        width={1200}
                                        height={700}
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-900 text-lg mb-2">Calendário conectado!</h3>
                                <p className="text-slate-600 text-sm mb-4">
                                    Após autorizar, você será redirecionado de volta ao Dashboard. O botão mudará para <strong>&quot;Ver Agenda&quot;</strong>,
                                    indicando que o calendário está conectado com sucesso. A aba <strong>&quot;Agenda&quot;</strong> também aparecerá no menu de navegação.
                                </p>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                                    <Image
                                        src="/ver-agenda.png"
                                        alt="Dashboard"
                                        width={1200}
                                        height={700}
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ========================================== */}
                {/* TUTORIAL 2: WhatsApp */}
                {/* ========================================== */}
                <div className="bg-white rounded-3xl p-3 sm:p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-white/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-green-600" />

                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Conectar ao WhatsApp</h2>
                            <p className="text-slate-500 text-sm">Vincule seu número para atendimento automatizado</p>
                        </div>
                    </div>

                    {/* Prerequisites */}
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-8">
                        <p className="text-sm text-amber-800">
                            <strong>⚠️ Pré-requisitos:</strong> Antes de conectar o WhatsApp, certifique-se de que:
                        </p>
                        <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                            <li>O <strong>Google Calendar</strong> já esteja conectado (tutorial acima)</li>
                            <li>Pelo menos um <strong>profissional</strong> esteja cadastrado em Configurações</li>
                        </ul>
                    </div>

                    <div className="space-y-8">
                        {/* Step 1 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                                <div className="w-0.5 flex-1 bg-emerald-200 mt-2" />
                            </div>
                            <div className="pb-8 flex-1">
                                <h3 className="font-semibold text-slate-900 text-lg mb-2">Crie a conexão</h3>
                                <p className="text-slate-600 text-sm mb-4">
                                    No Dashboard, localize o card <strong>&quot;Status do Bot&quot;</strong>. Na seção &quot;Conexão com o WhatsApp&quot;,
                                    clique no botão <strong>&quot;Criar conexão&quot;</strong>. Isso criará uma instância de conexão para vincular seu número.
                                </p>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                                    <Image
                                        src="/conexao-whatsapp.png"
                                        alt="Dashboard"
                                        width={1200}
                                        height={700}
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                                <div className="w-0.5 flex-1 bg-emerald-200 mt-2" />
                            </div>
                            <div className="pb-8 flex-1">
                                <h3 className="font-semibold text-slate-900 text-lg mb-2">Gere o QR Code</h3>
                                <p className="text-slate-600 text-sm mb-4">
                                    Após a conexão ser criada, o botão <strong>&quot;Gerar QR Code&quot;</strong> ficará disponível.
                                    Clique nele, preencha os dados para o prompt da IA ser configurado, depois escaneie o QR code com o número do WhatsApp de atendimento da clínica.
                                </p>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                                    <Image
                                        src="/qr-code.png"
                                        alt="Dashboard"
                                        width={1200}
                                        height={700}
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                                <div className="w-0.5 flex-1 bg-emerald-200 mt-2" />
                            </div>
                            <div className="pb-8 flex-1">
                                <h3 className="font-semibold text-slate-900 text-lg mb-2">Abra o WhatsApp no celular</h3>
                                <p className="text-slate-600 text-sm mb-4">
                                    No seu celular, abra o <strong>WhatsApp</strong> e siga o caminho:
                                </p>
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                            <ArrowRight className="h-3 w-3" />
                                        </div>
                                        <span className="text-sm text-slate-700">Abra o <strong>WhatsApp</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                            <ArrowRight className="h-3 w-3" />
                                        </div>
                                        <span className="text-sm text-slate-700">Toque nos <strong>3 pontinhos</strong> (menu) no canto superior direito</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                            <ArrowRight className="h-3 w-3" />
                                        </div>
                                        <span className="text-sm text-slate-700">Selecione <strong>&quot;Dispositivos conectados&quot;</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                            <ArrowRight className="h-3 w-3" />
                                        </div>
                                        <span className="text-sm text-slate-700">Toque em <strong>&quot;Conectar dispositivo&quot;</strong></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                                <div className="w-0.5 flex-1 bg-emerald-200 mt-2" />
                            </div>
                            <div className="pb-8 flex-1">
                                <h3 className="font-semibold text-slate-900 text-lg mb-2">Escaneie o QR Code</h3>
                                <p className="text-slate-600 text-sm">
                                    Use a câmera do seu celular para escanear o QR Code exibido no Dashboard.
                                    O WhatsApp iniciará a conexão automaticamente.
                                </p>
                            </div>
                        </div>

                        {/* Step 5 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-900 text-lg mb-2">WhatsApp conectado!</h3>
                                <p className="text-slate-600 text-sm mb-4">
                                    Após escanear o QR Code, aguarde alguns segundos. O status no card &quot;Status do Bot&quot; mudará para <strong>&quot;Conectado&quot;</strong>.
                                    A partir desse momento, a IA começará a responder automaticamente as mensagens recebidas no WhatsApp da clínica
                                    (se a IA estiver ativada).
                                </p>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                                    <Image
                                        src="/ia-conectada.png"
                                        alt="Dashboard"
                                        width={1200}
                                        height={700}
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 border border-white/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-600" />
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Atalhos rápidos</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Button
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-start gap-2 rounded-xl border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 transition-all"
                            onClick={() => router.push('/dashboard')}
                        >
                            <MonitorSmartphone className="h-5 w-5 text-cyan-600" />
                            <span className="font-medium text-slate-700">Ir ao Dashboard</span>
                            <span className="text-xs text-slate-500">Conectar calendário e WhatsApp</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-start gap-2 rounded-xl border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 transition-all"
                            onClick={() => router.push('/dashboard/settings?scrollTo=profissionais')}
                        >
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <span className="font-medium text-slate-700">Cadastrar Profissionais</span>
                            <span className="text-xs text-slate-500">Necessário antes de conectar o WhatsApp</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-start gap-2 rounded-xl border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 transition-all"
                            onClick={() => router.push('/dashboard/settings')}
                        >
                            <MessageSquare className="h-5 w-5 text-emerald-600" />
                            <span className="font-medium text-slate-700">Configurações</span>
                            <span className="text-xs text-slate-500">Dados da clínica e prompt da IA</span>
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}
