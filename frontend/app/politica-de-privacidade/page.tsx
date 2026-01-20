"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PoliticaDePrivacidade() {
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
              Política de Privacidade
            </h1>

            <p className="text-slate-600">
              Última atualização: {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="prose prose-slate max-w-none">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 space-y-8">
              
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Definições</h2>
                <p className="text-slate-600 leading-relaxed mb-3">
                  Para os fins desta Política de Privacidade, consideram-se:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li><strong>Dados Pessoais:</strong> Informações relacionadas a pessoa natural identificada ou identificável;</li>
                  <li><strong>Dados Sensíveis:</strong> Dados sobre saúde, origem racial ou étnica, convicção religiosa, opinião política, entre outros;</li>
                  <li><strong>Titular:</strong> Pessoa natural a quem se referem os dados pessoais;</li>
                  <li><strong>Controlador:</strong> AgendaIA, responsável pelas decisões sobre o tratamento de dados;</li>
                  <li><strong>Operador:</strong> Quem realiza o tratamento de dados em nome do controlador;</li>
                  <li><strong>Tratamento:</strong> Toda operação com dados pessoais (coleta, armazenamento, uso, compartilhamento, etc.).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Dados que Coletamos</h2>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">2.1. Dados de Clínicas e Profissionais</h3>
                <p className="text-slate-600 leading-relaxed mb-2">Coletamos as seguintes informações:</p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li><strong>Dados cadastrais:</strong> Nome completo, CPF/CNPJ, endereço, telefone, e-mail;</li>
                  <li><strong>Dados profissionais:</strong> Registro profissional (CRM, CRO), especialidade, horários de atendimento;</li>
                  <li><strong>Dados de acesso:</strong> Login, senha (criptografada), IP, histórico de acesso;</li>
                  <li><strong>Dados de pagamento:</strong> Informações para cobrança (processadas por gateway seguro);</li>
                  <li><strong>Dados de uso:</strong> Estatísticas de utilização da plataforma, preferências e configurações.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">2.2. Dados de Pacientes</h3>
                <p className="text-slate-600 leading-relaxed mb-2">
                  Os profissionais de saúde inserem na plataforma:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li><strong>Dados pessoais:</strong> Nome, data de nascimento, CPF, telefone, e-mail, endereço;</li>
                  <li><strong>Dados de saúde (sensíveis):</strong> Histórico médico, alergias, medicações, anamnese, diagnósticos, procedimentos realizados;</li>
                  <li><strong>Dados de agendamento:</strong> Histórico de consultas, horários, lembretes;</li>
                  <li><strong>Comunicações:</strong> Mensagens trocadas via WhatsApp integrado à plataforma.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">2.3. Dados Técnicos e de Navegação</h3>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li>Endereço IP, tipo de navegador e dispositivo;</li>
                  <li>Sistema operacional e versão;</li>
                  <li>Páginas visitadas e tempo de permanência;</li>
                  <li>Cookies e tecnologias similares;</li>
                  <li>Logs de acesso e segurança.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Como Usamos os Dados</h2>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">3.1. Finalidades do Tratamento</h3>
                <p className="text-slate-600 leading-relaxed mb-2">
                  Utilizamos os dados coletados para:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li><strong>Prestação de serviços:</strong> Fornecer as funcionalidades da plataforma de agendamento e gestão;</li>
                  <li><strong>Automação de atendimento:</strong> Enviar confirmações, lembretes e mensagens automáticas via IA;</li>
                  <li><strong>Gestão de consultas:</strong> Gerenciar agenda, horários e disponibilidade de profissionais;</li>
                  <li><strong>Prontuário eletrônico:</strong> Armazenar e organizar informações de saúde dos pacientes;</li>
                  <li><strong>Comunicação:</strong> Enviar notificações, atualizações e suporte técnico;</li>
                  <li><strong>Cobrança e faturamento:</strong> Processar pagamentos e emitir recibos;</li>
                  <li><strong>Melhoria dos serviços:</strong> Analisar uso para aprimorar funcionalidades;</li>
                  <li><strong>Segurança:</strong> Prevenir fraudes, abusos e garantir segurança da plataforma;</li>
                  <li><strong>Cumprimento legal:</strong> Atender obrigações legais e regulatórias.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">3.2. Bases Legais</h3>
                <p className="text-slate-600 leading-relaxed mb-2">
                  O tratamento de dados pessoais é realizado com base em:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li><strong>Consentimento:</strong> Quando solicitado explicitamente;</li>
                  <li><strong>Execução de contrato:</strong> Para prestação dos serviços contratados;</li>
                  <li><strong>Obrigação legal:</strong> Cumprimento de determinações legais;</li>
                  <li><strong>Tutela da saúde:</strong> Procedimentos realizados por profissionais de saúde;</li>
                  <li><strong>Legítimo interesse:</strong> Para melhoria de serviços e segurança.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Compartilhamento de Dados</h2>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">4.1. Com Quem Compartilhamos</h3>
                <p className="text-slate-600 leading-relaxed mb-2">
                  Podemos compartilhar dados com:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li><strong>Prestadores de serviços:</strong> Hospedagem (AWS, Google Cloud), gateway de pagamento, serviços de e-mail e SMS;</li>
                  <li><strong>Autoridades:</strong> Quando exigido por lei ou ordem judicial;</li>
                  <li><strong>Profissionais de saúde:</strong> Entre membros autorizados da mesma clínica;</li>
                  <li><strong>WhatsApp Business API:</strong> Para envio de mensagens automáticas (Meta/Facebook).</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">4.2. Proteções no Compartilhamento</h3>
                <p className="text-slate-600 leading-relaxed">
                  Todos os terceiros que acessam dados pessoais são contratualmente obrigados a:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6 mt-2">
                  <li>Tratar dados apenas para finalidades autorizadas;</li>
                  <li>Implementar medidas adequadas de segurança;</li>
                  <li>Cumprir as leis de proteção de dados;</li>
                  <li>Não utilizar os dados para fins próprios.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">4.3. Transferência Internacional</h3>
                <p className="text-slate-600 leading-relaxed">
                  Alguns de nossos prestadores de serviços podem estar localizados fora do Brasil. 
                  Nesses casos, garantimos que há mecanismos adequados de proteção, como cláusulas 
                  contratuais padrão e certificações de privacidade.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Segurança dos Dados</h2>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">5.1. Medidas de Segurança</h3>
                <p className="text-slate-600 leading-relaxed mb-2">
                  Implementamos medidas técnicas e organizacionais para proteger os dados:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li><strong>Criptografia:</strong> TLS/SSL para dados em trânsito e criptografia para dados sensíveis em repouso;</li>
                  <li><strong>Autenticação:</strong> Senhas criptografadas e autenticação de dois fatores disponível;</li>
                  <li><strong>Controle de acesso:</strong> Permissões baseadas em função (RBAC);</li>
                  <li><strong>Firewalls e antivírus:</strong> Proteção contra ataques e malware;</li>
                  <li><strong>Backups:</strong> Backups automáticos regulares;</li>
                  <li><strong>Monitoramento:</strong> Logs de acesso e detecção de atividades suspeitas;</li>
                  <li><strong>Treinamento:</strong> Equipe treinada em segurança e privacidade;</li>
                  <li><strong>Atualizações:</strong> Sistema regularmente atualizado com patches de segurança.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">5.2. Incidentes de Segurança</h3>
                <p className="text-slate-600 leading-relaxed">
                  Em caso de incidente de segurança que possa gerar risco aos titulares, notificaremos 
                  a Autoridade Nacional de Proteção de Dados (ANPD) e os afetados no prazo legal, 
                  informando as medidas tomadas para mitigar os danos.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Direitos dos Titulares</h2>

                <p className="text-slate-600 leading-relaxed mb-4">
                  Conforme a LGPD, você tem os seguintes direitos em relação aos seus dados pessoais:
                </p>

                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li><strong>Confirmação e Acesso:</strong> Confirmar se tratamos seus dados e acessar os dados que temos sobre você;</li>
                  <li><strong>Correção:</strong> Solicitar correção de dados incompletos, inexatos ou desatualizados;</li>
                  <li><strong>Anonimização, Bloqueio ou Eliminação:</strong> Solicitar anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;</li>
                  <li><strong>Portabilidade:</strong> Solicitar a portabilidade dos dados a outro fornecedor de serviços;</li>
                  <li><strong>Eliminação:</strong> Solicitar a eliminação dos dados tratados com base em consentimento;</li>
                  <li><strong>Informação sobre Compartilhamento:</strong> Obter informações sobre entidades públicas e privadas com as quais compartilhamos dados;</li>
                  <li><strong>Revogação do Consentimento:</strong> Revogar o consentimento a qualquer momento, quando aplicável;</li>
                  <li><strong>Oposição:</strong> Opor-se ao tratamento realizado em desconformidade com a lei;</li>
                  <li><strong>Revisão de Decisões Automatizadas:</strong> Solicitar revisão de decisões tomadas unicamente com base em tratamento automatizado.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">6.1. Como Exercer seus Direitos</h3>
                <p className="text-slate-600 leading-relaxed">
                  Para exercer qualquer um desses direitos, entre em contato através do e-mail 
                  <strong> privacidade@agendaia.com</strong> ou pelo canal de atendimento na plataforma. 
                  Responderemos sua solicitação em até 15 dias.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">6.2. Limitações</h3>
                <p className="text-slate-600 leading-relaxed">
                  Alguns direitos podem ter limitações quando:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6 mt-2">
                  <li>Houver obrigação legal de manter os dados;</li>
                  <li>Os dados forem necessários para exercício regular de direitos;</li>
                  <li>Houver necessidade de preservação de prontuário médico conforme legislação específica.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Retenção de Dados</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">7.1. Prazos de Retenção</h3>
                <p className="text-slate-600 leading-relaxed mb-2">
                  Mantemos os dados pessoais pelo tempo necessário para:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li><strong>Dados de clínicas ativas:</strong> Durante a vigência do contrato e por 5 anos após o encerramento;</li>
                  <li><strong>Dados de pacientes:</strong> Conforme determinado pela legislação de saúde (mínimo de 20 anos para prontuários);</li>
                  <li><strong>Dados fiscais:</strong> Pelo prazo legal de 5 anos;</li>
                  <li><strong>Logs de segurança:</strong> Por até 6 meses;</li>
                  <li><strong>Dados de marketing:</strong> Até a revogação do consentimento.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">7.2. Eliminação</h3>
                <p className="text-slate-600 leading-relaxed">
                  Após o término do período de retenção, os dados serão permanentemente eliminados 
                  ou anonimizados, exceto quando a manutenção for legalmente exigida.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Cookies e Tecnologias Similares</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">8.1. Tipos de Cookies</h3>
                <p className="text-slate-600 leading-relaxed mb-2">
                  Utilizamos os seguintes tipos de cookies:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li><strong>Cookies essenciais:</strong> Necessários para funcionamento básico (autenticação, segurança);</li>
                  <li><strong>Cookies de desempenho:</strong> Analisam como os usuários interagem com a plataforma;</li>
                  <li><strong>Cookies de funcionalidade:</strong> Lembram preferências e configurações;</li>
                  <li><strong>Cookies de marketing:</strong> Para exibir conteúdo relevante (apenas com consentimento).</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">8.2. Gerenciamento de Cookies</h3>
                <p className="text-slate-600 leading-relaxed">
                  Você pode gerenciar ou desabilitar cookies através das configurações do seu navegador. 
                  Note que isso pode afetar algumas funcionalidades da plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Dados de Menores de Idade</h2>
                <p className="text-slate-600 leading-relaxed">
                  A plataforma AgendaIA não se destina diretamente a menores de 18 anos. Quando um menor 
                  for paciente de uma clínica usuária, o tratamento de seus dados deve ser realizado com 
                  o consentimento de ao menos um dos pais ou responsável legal, conforme determina a LGPD.
                </p>
                <p className="text-slate-600 leading-relaxed mt-4">
                  Os profissionais de saúde são responsáveis por garantir a obtenção do consentimento 
                  adequado ao coletar dados de menores.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Alterações nesta Política</h2>
                <p className="text-slate-600 leading-relaxed">
                  Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças 
                  em nossas práticas ou na legislação. Alterações significativas serão notificadas com 
                  antecedência mínima de 30 dias através de:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6 mt-2">
                  <li>E-mail para o endereço cadastrado;</li>
                  <li>Notificação na plataforma;</li>
                  <li>Destaque no website.</li>
                </ul>
                <p className="text-slate-600 leading-relaxed mt-4">
                  O uso continuado da plataforma após a publicação das mudanças constitui aceitação 
                  das alterações.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Encarregado de Dados (DPO)</h2>
                <p className="text-slate-600 leading-relaxed">
                  Nosso Encarregado de Proteção de Dados (Data Protection Officer - DPO) é responsável 
                  por aceitar reclamações e comunicações dos titulares, prestar esclarecimentos e adotar 
                  providências.
                </p>
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mt-4">
                  <p className="text-slate-600 leading-relaxed">
                    <strong className="text-slate-900">Contato do DPO:</strong><br/>
                    E-mail: <strong>privacidade@agendaia.com</strong><br/>
                    WhatsApp: <strong>(27) 99688-7194</strong>
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Legislação e Autoridade</h2>
                <p className="text-slate-600 leading-relaxed">
                  Esta Política de Privacidade é regida pela legislação brasileira, especialmente:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6 mt-2">
                  <li>Lei Geral de Proteção de Dados (Lei nº 13.709/2018);</li>
                  <li>Marco Civil da Internet (Lei nº 12.965/2014);</li>
                  <li>Código de Defesa do Consumidor (Lei nº 8.078/1990);</li>
                  <li>Legislação específica para dados de saúde.</li>
                </ul>
                <p className="text-slate-600 leading-relaxed mt-4">
                  A autoridade competente para questões de proteção de dados é a Autoridade Nacional 
                  de Proteção de Dados (ANPD).
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Contato</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Para dúvidas, solicitações ou reclamações sobre privacidade e proteção de dados:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 mt-4">
                  <li><strong>E-mail:</strong> privacidade@agendaia.com</li>
                  <li><strong>WhatsApp:</strong> (27) 99688-7194</li>
                  <li><strong>Endereço:</strong> Vitória/ES - Brasil</li>
                </ul>
              </section>

              <section className="bg-slate-50 rounded-xl p-6 border border-slate-200 mt-8">
                <p className="text-slate-600 leading-relaxed text-sm">
                  <strong className="text-slate-900">Atenção:</strong> A AgendaIA está comprometida com a transparência e a proteção de seus dados. 
                  Estamos à disposição para esclarecer quaisquer dúvidas sobre como tratamos suas informações pessoais.
                </p>
              </section>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-16">
        <div className="container-narrow px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} AgendaIA. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/termos-de-uso" className="text-slate-600 hover:text-cyan-700 transition-colors">
                Termos de Uso
              </Link>
              <Link href="/contato" className="text-slate-600 hover:text-cyan-700 transition-colors">
                Contato
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
