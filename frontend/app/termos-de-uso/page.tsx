"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
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
          <div className="mb-2 md:mb-0 py-10 md:py-16">

            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Termos de Uso
            </h1>
            <p className="text-slate-600">
              Última atualização: 28 de janeiro de 2026
            </p>
          </div>

          <div className="prose prose-slate max-w-none">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 space-y-8">

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">1. IDENTIFICAÇÃO</h2>
                <p className="text-slate-600 leading-relaxed">
                  Este Termo de Uso regula a utilização do sistema Agenda IASync, operado por 64.698.083 ALVARO ANTUNES DE OLIVEIRA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 64.698.083/0001-17, com sede em Vitória – ES, doravante denominada IASync.
                </p>
                <p className="text-slate-600 leading-relaxed mt-4">
                  Ao realizar o cadastro e utilizar o sistema, o USUÁRIO, obrigatoriamente pessoa jurídica, declara que leu, compreendeu e concorda integralmente com estes Termos.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">2. OBJETO</h2>
                <p className="text-slate-600 leading-relaxed">
                  A Agenda IASync é uma plataforma SaaS (Software as a Service) destinada à gestão integrada de clínicas, consultórios e profissionais de saúde, licenciada em caráter não exclusivo e intransferível, abrangendo as seguintes funcionalidades:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6 mt-2">
                  <li>
                    <strong>Gestão de Agenda Inteligente:</strong> Agendamento multi-profissional, controle de faltas e bloqueios de horários.
                  </li>
                  <li>
                    <strong>Automação de Comunicação:</strong> Agendamento completo, confirmação de consultas e lembretes via WhatsApp.
                  </li>
                  <li>
                    <strong>Business Intelligence (BI):</strong> Dashboards gerenciais para avaliações de KPIs e sistema de conversas integrado.
                  </li>
                  <li>
                    <strong>Segurança e Compliance:</strong>  Recursos de segurança e conformidade com a Lei Geral de Proteção de Dados (LGPD).
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">3. ELEGIBILIDADE</h2>
                <div className="space-y-4">
                  <div>
                    <strong className="text-slate-800">3.1.</strong>
                    <span className="text-slate-600 ml-2">
                      A contratação e titularidade da conta são exclusivas para pessoas jurídicas (Clínicas, Consultórios e Empresas de Saúde).
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-800">3.2.</strong>
                    <span className="text-slate-600 ml-2">
                      O uso do sistema poderá ser realizado por pessoas físicas (recepcionistas, profissionais de saúde, administradores) desde que devidamente autorizadas e vinculadas à conta da pessoa jurídica titular.
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">4. CADASTRO E ACESSO</h2>
                <div className="space-y-4">
                  <div>
                    <strong className="text-slate-800">4.1.</strong>
                    <span className="text-slate-600 ml-2">
                      Para utilizar o sistema, o USUÁRIO deverá fornecer informações verdadeiras, completas e atualizadas.
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-800">4.2.</strong>
                    <span className="text-slate-600 ml-2">
                      O acesso é pessoal e intransferível, sendo de responsabilidade da clínica a gestão de seus usuários internos (recepcionistas, profissionais de saúde, administradores).
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-800">4.3.</strong>
                    <span className="text-slate-600 ml-2">
                      A IASync não se responsabiliza por acessos indevidos decorrentes de falha na gestão de credenciais pelo USUÁRIO.
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">5. TRIAL E PLANOS</h2>
                <div className="space-y-4">
                  <div>
                    <strong className="text-slate-800">5.1.</strong>
                    <span className="text-slate-600 ml-2">
                      A IASync concede ao USUÁRIO um período de teste gratuito (Trial) de 7 (sete) dias, contados a partir da data de cadastro, sem a necessidade de cadastramento de cartão de crédito.
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-800">5.2.</strong>
                    <span className="text-slate-600 ml-2">
                      Ao término do período de teste, o acesso às funcionalidades será suspenso até que o USUÁRIO opte pela contratação de um dos planos disponíveis e efetue o respectivo pagamento.
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">6. PAGAMENTOS E CANCELAMENTO</h2>
                <div className="space-y-4">
                  <div>
                    <strong className="text-slate-800">6.1.</strong>
                    <span className="text-slate-600 ml-2">
                      A cobrança dos planos na modalidade mensal ocorre de forma recorrente. Na modalidade anual, o pagamento é realizado em cota única, garantindo acesso pelo período de 12 (doze) meses.
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-800">6.2.</strong>
                    <span className="text-slate-600 ml-2">
                      O cancelamento pode ser solicitado a qualquer momento, permanecendo o acesso ativo até o final do ciclo vigente.
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-800">6.3.</strong>
                    <span className="text-slate-600 ml-2">
                      Não há reembolso proporcional de valores já pagos.
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">7. RESPONSABILIDADES DO USUÁRIO</h2>
                <p className="text-slate-600 leading-relaxed mb-2">
                  O USUÁRIO declara e concorda que:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li>É integralmente responsável pelas informações inseridas no sistema, incluindo dados clínicos e prontuários.</li>
                  <li>Deve garantir que seus profissionais atuem de acordo com as normas éticas e legais da área da saúde.</li>
                  <li>É o controlador dos dados pessoais e de saúde dos pacientes, nos termos da LGPD.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">8. RESPONSABILIDADES DA IASync</h2>
                <p className="text-slate-600 leading-relaxed mb-2">
                  A IASync compromete-se a:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li>Manter a plataforma disponível, ressalvadas manutenções e indisponibilidades técnicas.</li>
                  <li>Adotar medidas de segurança compatíveis com o tratamento de dados sensíveis.</li>
                  <li>Atuar como operadora de dados, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">9. LIMITAÇÃO DE RESPONSABILIDADE</h2>
                <div className="space-y-4">
                  <div>
                    <strong className="text-slate-800">9.1.</strong>
                    <span className="text-slate-600 ml-2">
                      O Agenda IASync é uma ferramenta de apoio à gestão.
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-800">9.2.</strong>
                    <span className="text-slate-600 ml-2">
                      O sistema não substitui julgamento, diagnóstico ou decisão médica, sendo tais atos de responsabilidade exclusiva dos profissionais de saúde.
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-800">9.3.</strong>
                    <span className="text-slate-600 ml-2">
                      A IASync não se responsabiliza por danos decorrentes do uso inadequado da plataforma.
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">10. LGPD E PROTEÇÃO DE DADOS</h2>
                <div className="space-y-4">
                  <div>
                    <strong className="text-slate-800">10.1.</strong>
                    <span className="text-slate-600 ml-2">
                      A IASync atua como operadora de dados, enquanto o USUÁRIO é o controlador.
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-800">10.2.</strong>
                    <span className="text-slate-600 ml-2">
                      O tratamento de dados de saúde ocorre com base legal na tutela da saúde, nos termos da LGPD.
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-800">10.3.</strong>
                    <span className="text-slate-600 ml-2">
                      As partes firmarão, quando aplicável, Contrato de Operador de Dados (DPA).
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">11. PROPRIEDADE INTELECTUAL</h2>
                <p className="text-slate-600 leading-relaxed">
                  Todo o software, layout, marcas e funcionalidades pertencem exclusivamente à IASync, sendo vedada qualquer reprodução ou uso não autorizado.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">12. SUSPENSÃO E ENCERRAMENTO</h2>
                <p className="text-slate-600 leading-relaxed mb-2">
                  A IASync poderá suspender ou encerrar o acesso em caso de:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li>Uso ilegal ou abusivo.</li>
                  <li>Violação destes Termos.</li>
                  <li>Tentativa de acesso não autorizado.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">13. FORO</h2>
                <p className="text-slate-600 leading-relaxed">
                  Fica eleito o foro da comarca de Vitória – ES, para dirimir quaisquer controvérsias decorrentes deste Termo.
                </p>
              </section>

            </div>
          </div>
        </motion.div>
      </main>

    </div>
  );
}
