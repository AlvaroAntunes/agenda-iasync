"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle2, X, Check } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"

// Lista de UFs brasileiras
const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SP", "SE", "TO"
]

export default function CadastroClinicaPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  // Estados do formulário
  const [nomeClinica, setNomeClinica] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [endereco, setEndereco] = useState("")
  const [uf, setUf] = useState("")
  const [cidade, setCidade] = useState("")
  const [senha, setSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [cnpjClinica, setCnpjClinica] = useState("")
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [aceitoTermos, setAceitoTermos] = useState(false)
  const [aceitoPrivacidade, setAceitoPrivacidade] = useState(false)

  // Máscara de telefone
  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    
    if (numbers.length === 0) return ""
    if (numbers.length <= 2) return `(${numbers}`
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelefone(e.target.value)
    setTelefone(formatted)
  }

  // Máscara de CNPJ
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    
    if (numbers.length === 0) return ""
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`
  }

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value)
    setCnpjClinica(formatted)
  }

  // Validar CNPJ
  const validarCNPJ = (cnpj: string): boolean => {
    const numbers = cnpj.replace(/\D/g, "")
    
    if (numbers.length !== 14) return false
    
    // Rejeitar CNPJs com todos os dígitos iguais
    if (/^(\d)\1+$/.test(numbers)) return false
    
    // Validar primeiro dígito verificador
    let sum = 0
    let weight = 5
    for (let i = 0; i < 12; i++) {
      sum += parseInt(numbers[i]) * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (digit !== parseInt(numbers[12])) return false
    
    // Validar segundo dígito verificador
    sum = 0
    weight = 6
    for (let i = 0; i < 13; i++) {
      sum += parseInt(numbers[i]) * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    digit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (digit !== parseInt(numbers[13])) return false
    
    return true
  }

  const isCNPJValid = cnpjClinica.replace(/\D/g, "").length === 14 ? validarCNPJ(cnpjClinica) : true

  // Validações de senha em tempo real
  const passwordValidation = {
    minLength: senha.length >= 8,
    hasLowerCase: /[a-z]/.test(senha),
    hasUpperCase: /[A-Z]/.test(senha),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha),
  }

  const isPasswordValid = Object.values(passwordValidation).every(Boolean)

  // Verificar se todos os campos estão preenchidos
  const isFormValid = 
    nomeClinica.trim() !== "" &&
    cnpjClinica.replace(/\D/g, "").length === 14 &&
    isCNPJValid &&
    telefone.replace(/\D/g, "").length >= 10 &&
    email.trim() !== "" &&
    uf !== "" &&
    cidade.trim() !== "" &&
    endereco.trim() !== "" &&
    isPasswordValid &&
    senha === confirmarSenha &&
    aceitoTermos &&
    aceitoPrivacidade

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validações dos termos
    if (!aceitoTermos) {
      setError("Você deve aceitar os Termos de Uso para continuar")
      setIsLoading(false)
      return
    }

    if (!aceitoPrivacidade) {
      setError("Você deve aceitar a Política de Privacidade para continuar")
      setIsLoading(false)
      return
    }

    // Validação de CNPJ
    if (!validarCNPJ(cnpjClinica)) {
      setError("CNPJ inválido. Por favor, verifique os dígitos.")
      setIsLoading(false)
      return
    }

    // Validações de senha
    if (senha.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres")
      setIsLoading(false)
      return
    }

    const hasLowerCase = /[a-z]/.test(senha)
    const hasUpperCase = /[A-Z]/.test(senha)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)

    if (!hasLowerCase) {
      setError("A senha deve conter pelo menos uma letra minúscula")
      setIsLoading(false)
      return
    }

    if (!hasUpperCase) {
      setError("A senha deve conter pelo menos uma letra maiúscula")
      setIsLoading(false)
      return
    }

    if (!hasSpecialChar) {
      setError("A senha deve conter pelo menos um caractere especial (!@#$%^&*...)")
      setIsLoading(false)
      return
    }

    if (senha !== confirmarSenha) {
      setError("As senhas não coincidem")
      setIsLoading(false)
      return
    }

    const telefoneNumeros = telefone.replace(/\D/g, "")
    if (telefoneNumeros.length < 10) {
      setError("Telefone inválido")
      setIsLoading(false)
      return
    }

    const cnpjNumeros = cnpjClinica.replace(/\D/g, "")

    try {
      // Chamar API route para cadastrar (server-side com service role)
      const response = await fetch('/api/cadastro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nomeClinica,
          cnpjClinica: cnpjNumeros,
          telefone: telefoneNumeros,
          email,
          endereco,
          cidade,
          uf,
          senha,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar')
      }

      // Se retornou requiresSignup, fazer o signup no cliente para enviar o email correto
      if (data.requiresSignup) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/confirm-email`,
            data: {
              full_name: nomeClinica,
              clinic_id: data.clinicId,
            }
          }
        })

        if (signUpError) {
          console.error('Erro ao fazer signup:', signUpError)
          throw new Error('Erro ao enviar email de confirmação')
        }

        // Atualizar o perfil com os dados da clínica
        if (signUpData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              role: 'clinic_admin',
              clinic_id: data.clinicId,
              is_active: true,
              full_name: nomeClinica,
              phone: telefone.replace(/\D/g, ""),
            })
            .eq('id', signUpData.user.id)

          if (profileError) {
            console.error('Erro ao atualizar perfil:', profileError)
          }
        }
      }

      setSuccess(true)
      
      // Scroll para o topo para mostrar a mensagem de sucesso
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
      // Redirecionar para página de confirmação após 8 segundos
      setTimeout(() => {
        router.push("/login")
      }, 8000)

    } catch (error: any) {
      console.error('Erro ao cadastrar:', error)
      setError(error.message || 'Erro ao cadastrar. Tente novamente.')
      
      // Scroll para o topo da página para mostrar a mensagem de erro
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
      // Limpar mensagem de erro após 5 segundos
      setTimeout(() => {
        setError("")
      }, 4000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 py-12">
      {/* Background com gradiente suave */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-50 via-sky-50 to-cyan-50" />
      
      {/* Padrão de grid sutil */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(15 23 42) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Elementos decorativos */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500 rounded-full blur-[120px] opacity-10"
      />
      <motion.div
        animate={{ 
          scale: [1.1, 1, 1.1],
          opacity: [0.08, 0.12, 0.08]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-400 rounded-full blur-[100px] opacity-10"
      />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Botão Voltar */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Link href="/login">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-cyan-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </motion.div>

        {/* Card de Cadastro */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-100/60 p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center justify-center mb-6"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 shadow-lg shadow-cyan-500/30">
                <Building2 className="h-8 w-8 text-white" strokeWidth={1.5} />
              </div>
            </motion.div>

            <h1 className="text-3xl font-bold text-cyan-950 tracking-tight mb-2">
              Cadastrar Nova Clínica
            </h1>
            <p className="text-cyan-900/70 text-sm">
              Comece seu período de 7 dias grátis agora mesmo.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleCadastro} className="space-y-5">
            {success ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="space-y-2">
                      <p className="font-semibold">🎉 Cadastro realizado com sucesso!</p>
                      <p>Enviamos um email de confirmação para <strong>{email}</strong></p>
                      <p className="text-sm">Por favor, verifique sua caixa de entrada e clique no link de confirmação para ativar sua conta.</p>
                      <p className="text-xs mt-2">💡 <strong>Dica:</strong> Verifique também a caixa de spam ou lixo eletrônico</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </motion.div>
            ) : error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Grid de 2 colunas para campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nome da Clínica */}
              <div className="space-y-2">
                <Label htmlFor="nomeClinica" className="text-cyan-900 font-medium">
                  Nome da Clínica *
                </Label>
                <Input
                  id="nomeClinica"
                  type="text"
                  placeholder="Ex: Odonto Mais"
                  value={nomeClinica}
                  onChange={(e) => setNomeClinica(e.target.value)}
                  required
                  disabled={isLoading || success}
                  className="h-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
                />
              </div>

                {/* CNPJ da Clínica */}
              <div className="space-y-2">
                <Label htmlFor="cnpjClinica" className="text-cyan-900 font-medium">
                  CNPJ *
                </Label>
                <Input
                  id="cnpjClinica"
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={cnpjClinica}
                  onChange={handleCNPJChange}
                  required
                  disabled={isLoading || success}
                  className="h-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
                  maxLength={18}
                />
                {cnpjClinica.replace(/\D/g, "").length === 14 && (
                  <div className="flex items-center gap-2 text-xs mt-1">
                    {isCNPJValid ? (
                      <>
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-green-700">CNPJ válido</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                        <span className="text-red-600">CNPJ inválido</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-cyan-900 font-medium">
                  Telefone *
                </Label>
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={handleTelefoneChange}
                  required
                  disabled={isLoading || success}
                  className="h-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
                  maxLength={15}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-cyan-900 font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="clinica@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || success}
                  className="h-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
                />
              </div>

              {/* UF */}
              <div className="space-y-2">
                <Label htmlFor="uf" className="text-cyan-900 font-medium">
                  UF *
                </Label>
                <select
                  id="uf"
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  required
                  disabled={isLoading || success}
                  className="h-12 w-full border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white rounded-md border px-3 text-sm"
                >
                  <option value="">Selecione</option>
                  {UFS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cidade */}
              <div className="space-y-2">
                <Label htmlFor="cidade" className="text-cyan-900 font-medium">
                  Cidade *
                </Label>
                <Input
                  id="cidade"
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  required
                  disabled={isLoading || success}
                  className="h-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
                />
              </div>

              {/* Endereço */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="endereco" className="text-cyan-900 font-medium">
                  Endereço *
                </Label>
                <Input
                  id="endereco"
                  type="text"
                  placeholder="Rua, número, bairro"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  required
                  disabled={isLoading || success}
                  className="h-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
                />
              </div>

              {/* Senha */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="senha" className="text-cyan-900 font-medium">
                  Senha *
                </Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    disabled={isLoading || success}
                    className="h-12 pr-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-cyan-600 hover:text-cyan-700"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || success}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                {senha && (
                  <div className="space-y-2 mt-3 p-3 bg-cyan-50/50 rounded-lg border border-cyan-100">
                    <p className="text-xs font-medium text-cyan-900 mb-2">Requisitos da senha:</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        {passwordValidation.minLength ? (
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className={passwordValidation.minLength ? "text-green-700" : "text-red-600"}>
                          Mínimo 8 caracteres
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {passwordValidation.hasLowerCase ? (
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className={passwordValidation.hasLowerCase ? "text-green-700" : "text-red-600"}>
                          Pelo menos uma letra minúscula
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {passwordValidation.hasUpperCase ? (
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className={passwordValidation.hasUpperCase ? "text-green-700" : "text-red-600"}>
                          Pelo menos uma letra MAIÚSCULA
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {passwordValidation.hasSpecialChar ? (
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className={passwordValidation.hasSpecialChar ? "text-green-700" : "text-red-600"}>
                          Pelo menos um caractere especial (!@#$%...)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="confirmarSenha" className="text-cyan-900 font-medium">
                  Confirmar Senha *
                </Label>
                <div className="relative">
                  <Input
                    id="confirmarSenha"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    required
                    disabled={isLoading || success}
                    className="h-12 pr-12 border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400/20 bg-white"
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-cyan-600 hover:text-cyan-700"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading || success}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                {confirmarSenha && (
                  <div className="flex items-center gap-2 text-xs mt-2">
                    {senha === confirmarSenha && isPasswordValid ? (
                      <>
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-green-700">As senhas coincidem</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                        <span className="text-red-600">As senhas devem ser iguais</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Termos e Política de Privacidade */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={aceitoTermos}
                  onChange={(e) => setAceitoTermos(e.target.checked)}
                  className="mt-0.5 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500"
                  disabled={isLoading || success}
                  required
                />
                <span className="text-sm text-cyan-900/80 group-hover:text-cyan-900">
                  Li e aceito os{" "}
                  <Link href="/termos-de-uso" target="_blank" className="text-cyan-700 hover:text-cyan-800 font-semibold hover:underline">
                    Termos de Uso
                  </Link>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={aceitoPrivacidade}
                  onChange={(e) => setAceitoPrivacidade(e.target.checked)}
                  className="mt-0.5 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500"
                  disabled={isLoading || success}
                  required
                />
                <span className="text-sm text-cyan-900/80 group-hover:text-cyan-900">
                  Li e aceito a{" "}
                  <Link href="/politica-de-privacidade" target="_blank" className="text-cyan-700 hover:text-cyan-800 font-semibold hover:underline">
                    Política de Privacidade
                  </Link>
                </span>
              </label>
            </div>

            {/* Banner Teste Grátis */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4 text-center"
            >
              <div className="text-2xl mb-1">🎉</div>
              <h3 className="text-base font-bold text-cyan-900 mb-1">7 Dias Grátis - Acesso Imediato!</h3>
              <p className="text-xs text-cyan-700">
                Ao se cadastrar, sua conta é ativada instantaneamente. Comece a usar todas as funcionalidades agora mesmo!
              </p>
            </motion.div>

            {/* Botão de Cadastro */}
            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-600 disabled:hover:to-blue-600" 
                disabled={!isFormValid || isLoading || success}
              >
                {isLoading ? "Cadastrando..." : success ? "Cadastrado com sucesso!" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-cyan-900/70">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-cyan-700 hover:text-cyan-800 font-semibold hover:underline">
              Fazer login
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
