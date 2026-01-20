"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TermosDeUso() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Content */}
      <main className="container-narrow px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div className="mb-12">

            <div className="container-narrow py-8">
                <div className="flex items-center justify-between">
                    <button
                      onClick={() => router.back()}
                      className="flex items-center gap-2 text-slate-600 hover:text-cyan-700 transition-colors text-sm cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>
                </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Termos de Uso
            </h1>
            <p className="text-slate-600">
              Última atualização: {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="prose prose-slate max-w-none">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 space-y-8">
              
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Aceitação dos Termos</h2>
                <p className="text-slate-600 leading-relaxed">
                  Ao acessar e utilizar a plataforma Agenda IASync, você concorda em cumprir e estar vinculado aos 
                  presentes Termos de Uso. Se você não concorda com qualquer parte destes termos, não deve 
                  utilizar nossos serviços.
                </p>
                <p className="text-slate-600 leading-relaxed mt-4">
                  A Agenda IASync é uma plataforma de gestão e agendamento para clínicas médicas e odontológicas, 
                  que utiliza inteligência artificial para automatizar processos de atendimento ao paciente.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Definições</h2>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li><strong>Plataforma:</strong> Sistema Agenda IASync e todos os seus recursos e funcionalidades.</li>
                  <li><strong>Usuário:</strong> Clínicas, profissionais de saúde e suas equipes que utilizam a plataforma.</li>
                  <li><strong>Paciente:</strong> Pessoa física que agenda consultas através da plataforma.</li>
                  <li><strong>Serviços:</strong> Todas as funcionalidades oferecidas pela Agenda IASync.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Cadastro e Conta</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">3.1. Requisitos de Cadastro</h3>
                <p className="text-slate-600 leading-relaxed">
                  Para utilizar a plataforma, é necessário:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6 mt-2">
                  <li>Fornecer informações verdadeiras, precisas e completas;</li>
                  <li>Manter seus dados cadastrais atualizados;</li>
                  <li>Ser uma pessoa jurídica regularmente constituída ou profissional de saúde habilitado;</li>
                  <li>Possuir registro ativo nos conselhos profissionais competentes (CRM, CRO, etc.).</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">3.2. Responsabilidade pela Conta</h3>
                <p className="text-slate-600 leading-relaxed">
                  Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas 
                  as atividades realizadas em sua conta. Notifique-nos imediatamente sobre qualquer uso não 
                  autorizado de sua conta.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Uso da Plataforma</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">4.1. Licença de Uso</h3>
                <p className="text-slate-600 leading-relaxed">
                  Concedemos a você uma licença limitada, não exclusiva, intransferível e revogável para 
                  usar a plataforma de acordo com estes termos e o plano contratado.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">4.2. Restrições de Uso</h3>
                <p className="text-slate-600 leading-relaxed mb-2">Você concorda em NÃO:</p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li>Usar a plataforma para fins ilegais ou não autorizados;</li>
                  <li>Tentar obter acesso não autorizado a qualquer parte da plataforma;</li>
                  <li>Interferir ou interromper o funcionamento da plataforma;</li>
                  <li>Fazer engenharia reversa, descompilar ou desmontar qualquer parte do sistema;</li>
                  <li>Revender ou transferir sua licença a terceiros sem autorização;</li>
                  <li>Utilizar robôs, spiders ou outros meios automatizados não autorizados;</li>
                  <li>Remover quaisquer avisos de propriedade intelectual.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Planos e Pagamentos</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">5.1. Planos Disponíveis</h3>
                <p className="text-slate-600 leading-relaxed">
                  A Agenda IASync oferece diferentes planos de assinatura com recursos e limites variados. 
                  Os detalhes de cada plano estão disponíveis em nossa página de preços.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">5.2. Período de Teste</h3>
                <p className="text-slate-600 leading-relaxed">
                  Novos usuários têm direito a um período de teste gratuito de 7 dias. Após este período, 
                  será necessário contratar um plano para continuar utilizando a plataforma.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">5.3. Cobrança e Renovação</h3>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li>As assinaturas são cobradas mensalmente ou anualmente, conforme o plano escolhido;</li>
                  <li>A renovação é automática, salvo cancelamento prévio;</li>
                  <li>Os valores podem ser reajustados mediante aviso prévio de 30 dias;</li>
                  <li>Não há reembolso proporcional em caso de cancelamento.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">5.4. Atraso no Pagamento</h3>
                <p className="text-slate-600 leading-relaxed">
                  Em caso de inadimplência, a conta será suspensa após 5 dias do vencimento. Se o pagamento 
                  não for regularizado em 30 dias, a conta poderá ser cancelada e os dados removidos.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Dados e Privacidade</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">6.1. Proteção de Dados</h3>
                <p className="text-slate-600 leading-relaxed">
                  A Agenda IASync está comprometida com a proteção de dados pessoais, em conformidade com a 
                  Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Para mais informações, 
                  consulte nossa <Link href="/politica-de-privacidade" className="text-cyan-700 hover:underline">Política de Privacidade</Link>.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">6.2. Propriedade dos Dados</h3>
                <p className="text-slate-600 leading-relaxed">
                  Os dados inseridos por você na plataforma permanecem de sua propriedade. A Agenda IASync atua 
                  como operadora de dados, processando-os apenas para fornecer os serviços contratados.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">6.3. Backup e Segurança</h3>
                <p className="text-slate-600 leading-relaxed">
                  Realizamos backups regulares dos dados, mas recomendamos que você mantenha cópias próprias 
                  de informações críticas. Utilizamos medidas de segurança padrão da indústria, mas não 
                  podemos garantir segurança absoluta.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Responsabilidades Médicas</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">7.1. Natureza do Serviço</h3>
                <p className="text-slate-600 leading-relaxed">
                  A Agenda IASync é uma ferramenta de gestão e agendamento. NÃO somos responsáveis por:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6 mt-2">
                  <li>Diagnósticos, tratamentos ou decisões médicas;</li>
                  <li>Qualidade do atendimento prestado pelos profissionais;</li>
                  <li>Relação médico-paciente ou dentista-paciente;</li>
                  <li>Cumprimento de regulamentações específicas da área de saúde;</li>
                  <li>Prontuários médicos e sua conformidade legal.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">7.2. Responsabilidade Profissional</h3>
                <p className="text-slate-600 leading-relaxed">
                  Os profissionais de saúde são os únicos responsáveis por seus atos profissionais, 
                  devendo manter registro válido nos conselhos competentes e seguir todas as normas éticas 
                  e legais aplicáveis.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Inteligência Artificial</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">8.1. Uso de IA</h3>
                <p className="text-slate-600 leading-relaxed">
                  A plataforma utiliza inteligência artificial para automatizar agendamentos e comunicações 
                  com pacientes. As interações são supervisionadas e podem ser revisadas pela equipe da clínica.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">8.2. Limitações</h3>
                <p className="text-slate-600 leading-relaxed">
                  A IA é uma ferramenta de suporte e pode apresentar erros ou limitações. Recomendamos 
                  revisão humana para decisões críticas. Não nos responsabilizamos por falhas ou mal-entendidos 
                  gerados por respostas automáticas.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Propriedade Intelectual</h2>
                <p className="text-slate-600 leading-relaxed">
                  Todo o conteúdo da plataforma, incluindo código-fonte, design, logotipos, textos e 
                  funcionalidades, é de propriedade exclusiva da Agenda IASync ou de seus licenciadores, 
                  protegido por leis de direitos autorais e propriedade intelectual.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Garantias e Limitações</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">10.1. Disponibilidade</h3>
                <p className="text-slate-600 leading-relaxed">
                  Nos esforçamos para manter a plataforma disponível 24/7, mas não garantimos disponibilidade 
                  ininterrupta. Podem ocorrer manutenções programadas ou interrupções não planejadas.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">10.2. Limitação de Responsabilidade</h3>
                <p className="text-slate-600 leading-relaxed">
                  A Agenda IASync não será responsável por:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6 mt-2">
                  <li>Danos indiretos, incidentais ou consequentes;</li>
                  <li>Perda de lucros, dados ou oportunidades de negócio;</li>
                  <li>Problemas causados por terceiros (internet, energia, etc.);</li>
                  <li>Uso inadequado da plataforma;</li>
                  <li>Decisões tomadas com base nas informações da plataforma.</li>
                </ul>
                <p className="text-slate-600 leading-relaxed mt-4">
                  Nossa responsabilidade total está limitada ao valor pago nos últimos 12 meses.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Cancelamento e Rescisão</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">11.1. Cancelamento pelo Usuário</h3>
                <p className="text-slate-600 leading-relaxed">
                  Você pode cancelar sua assinatura a qualquer momento através do painel de controle. 
                  O acesso permanecerá ativo até o fim do período pago.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">11.2. Cancelamento pela Agenda IASync</h3>
                <p className="text-slate-600 leading-relaxed">
                  Podemos suspender ou cancelar sua conta imediatamente em caso de:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6 mt-2">
                  <li>Violação destes Termos de Uso;</li>
                  <li>Inadimplência prolongada;</li>
                  <li>Uso fraudulento ou ilegal da plataforma;</li>
                  <li>Atividades que prejudiquem outros usuários ou a plataforma.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">11.3. Dados Após Cancelamento</h3>
                <p className="text-slate-600 leading-relaxed">
                  Após o cancelamento, você terá 30 dias para exportar seus dados. Após esse prazo, 
                  os dados poderão ser permanentemente removidos, exceto quando a retenção for legalmente 
                  necessária.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Modificações</h2>
                <p className="text-slate-600 leading-relaxed">
                  Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. 
                  Alterações significativas serão notificadas com 30 dias de antecedência via e-mail 
                  ou através da plataforma. O uso continuado após as mudanças constitui aceitação dos 
                  novos termos.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Lei Aplicável e Foro</h2>
                <p className="text-slate-600 leading-relaxed">
                  Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. 
                  Fica eleito o foro da comarca de Vitória/ES para dirimir quaisquer controvérsias 
                  decorrentes destes termos, com exclusão de qualquer outro, por mais privilegiado que seja.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">14. Contato</h2>
                <p className="text-slate-600 leading-relaxed">
                  Para dúvidas sobre estes Termos de Uso, entre em contato:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 mt-4">
                  <li><strong>E-mail:</strong> contatoiasync@gmail.com</li>
                  <li><strong>WhatsApp:</strong> (27) 99688-7194</li>
                  <li><strong>Endereço:</strong> Vitória/ES - Brasil</li>
                </ul>
              </section>

              <section className="bg-cyan-50 rounded-xl p-6 border border-cyan-100 mt-8">
                <p className="text-slate-600 leading-relaxed text-sm">
                  <strong className="text-slate-900">Atenção:</strong> Ao utilizar a plataforma Agenda IASync, 
                  você declara ter lido, compreendido e concordado com todos os termos acima descritos.
                </p>
              </section>
            </div>
          </div>
        </motion.div>
      </main>

    </div>
  );
}
