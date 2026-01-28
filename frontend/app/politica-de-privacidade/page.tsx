"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
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
          <div className="mb-2 md:mb-0 py-10 md:py-16">

            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Política de Privacidade
            </h1>

            <p className="text-slate-600">
              Última atualização: 28 de janeiro de 2026
            </p>
          </div>

          <div className="prose prose-slate max-w-none">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 space-y-8">

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">1. QUEM SOMOS</h2>
                <p className="text-slate-600 leading-relaxed mb-3">
                  A 64.698.083 ALVARO ANTUNES DE OLIVEIRA, CNPJ nº 64.698.083/0001-17, com sede em Vitória – ES, é a responsável pela plataforma Agenda IASync.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">2. DADOS COLETADOS</h2>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">2.1. Dados da clínica e usuários</h3>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li>Nome, email, telefone, endereco, CNPJ.</li>
                  <li>Dados de acesso.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">2.2. Dados de pacientes</h3>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li>Nome, telefone.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">3. PAPÉIS NA LGPD</h2>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li><strong>Clínica:</strong> Controladora dos dados.</li>
                  <li><strong>IASync:</strong> Operadora dos dados.</li>
                </ul>
                <p className="text-slate-600 leading-relaxed mt-4">
                  A IASync trata os dados exclusivamente conforme instruções da clínica.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">4. BASE LEGAL</h2>
                <p className="text-slate-600 leading-relaxed mb-2">
                  O tratamento de dados pessoais e sensíveis ocorre com base em:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li>Execução de contrato.</li>
                  <li>Cumprimento de obrigação legal.</li>
                  <li>Tutela da saúde (dados de saúde).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">5. SEGURANÇA DA INFORMAÇÃO</h2>
                <p className="text-slate-600 leading-relaxed mb-2">
                  A IASYNC adota medidas técnicas e administrativas adequadas, incluindo:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li>Controle de acesso por perfil.</li>
                  <li>Logs de auditoria.</li>
                  <li>Infraestrutura segura.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">6. COMPARTILHAMENTO DE DADOS</h2>
                <p className="text-slate-600 leading-relaxed">
                  Os dados podem ser processados por fornecedores de infraestrutura tecnológica, sempre observando padrões de segurança e confidencialidade.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">7. RETENÇÃO DOS DADOS</h2>
                <p className="text-slate-600 leading-relaxed">
                  Os dados são mantidos pelo período necessário para cumprimento das finalidades legais, contratuais e regulatórias, especialmente as relacionadas à área da saúde.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">8. DIREITOS DOS TITULARES</h2>
                <p className="text-slate-600 leading-relaxed mb-2">
                  O titular dos dados pode solicitar, por meio da clínica:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li>Confirmação de tratamento.</li>
                  <li>Acesso aos dados.</li>
                  <li>Correção.</li>
                  <li>Anonimização ou exclusão, quando aplicável.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">9. COMUNICAÇÕES</h2>
                <ul className="text-slate-600 leading-relaxed space-y-2 list-disc pl-6">
                  <li>A IASync poderá enviar comunicações institucionais.</li>
                  <li>Comunicações de marketing dependem de consentimento e podem ser revogadas a qualquer momento.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">10. CONTATO</h2>
                <p className="text-slate-600 leading-relaxed mb-2">
                  Para assuntos relacionados à privacidade e proteção de dados:
                </p>
                <ul className="text-slate-600 leading-relaxed space-y-2 mt-4">
                  <li>📧 contatoiasync@gmail.com</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">11. ALTERAÇÕES</h2>
                <p className="text-slate-600 leading-relaxed">
                  Esta Política pode ser atualizada periodicamente. A versão vigente estará sempre disponível no site.
                </p>
              </section>

            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
