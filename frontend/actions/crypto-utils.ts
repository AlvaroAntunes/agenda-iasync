"use server"

import crypto from 'crypto'

// Chave secreta que fica apenas no servidor
const SECRET_KEY = process.env.CRYPTO_SECRET_KEY || 'c1!n1c@s_adfaas3rADADAFçav3r_k3y_2026#$%&*'
const ALGORITHM = 'aes-256-cbc'

/**
 * Criptografa um texto usando AES-256-CBC
 */
export async function encryptData(text: string): Promise<string> {
  try {
    const iv = crypto.randomBytes(16)
    const key = crypto.scryptSync(SECRET_KEY, 'salt', 32)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Combinar IV + dados criptografados e codificar em base64
    const combined = iv.toString('hex') + ':' + encrypted
    return Buffer.from(combined).toString('base64')
  } catch (error) {
    console.error('Erro ao criptografar dados:', error)
    throw new Error('Erro na criptografia')
  }
}

/**
 * Descriptografa um texto criptografado
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    // Decodificar base64 e separar IV dos dados
    const combined = Buffer.from(encryptedData, 'base64').toString('utf8')
    const [ivHex, encrypted] = combined.split(':')
    
    if (!ivHex || !encrypted) {
      throw new Error('Formato de dados inválido')
    }
    
    const iv = Buffer.from(ivHex, 'hex')
    const key = crypto.scryptSync(SECRET_KEY, 'salt', 32)
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Erro ao descriptografar dados:', error)
    return ''
  }
}

/**
 * Gera uma chave criptografada para o localStorage
 */
export async function generateSecureKey(keyName: string): Promise<string> {
  try {
    const timestamp = Date.now().toString()
    const combined = `clinic_${keyName}_${timestamp}_secure`
    return await encryptData(combined)
  } catch (error) {
    console.error('Erro ao gerar chave segura:', error)
    throw new Error('Erro na geração de chave')
  }
}

/**
 * Salva dados criptografados (chave e valor)
 */
export async function setSecureData(keyName: string, value: string): Promise<{
  encryptedKey: string
  encryptedValue: string
}> {
  try {
    const [encryptedKey, encryptedValue] = await Promise.all([
      generateSecureKey(keyName),
      encryptData(value)
    ])
    
    return {
      encryptedKey,
      encryptedValue
    }
  } catch (error) {
    console.error('Erro ao salvar dados seguros:', error)
    throw new Error('Erro ao processar dados seguros')
  }
}

/**
 * Recupera e descriptografa dados
 */
export async function getSecureData(encryptedValue: string): Promise<string> {
  try {
    return await decryptData(encryptedValue)
  } catch (error) {
    console.error('Erro ao recuperar dados seguros:', error)
    return ''
  }
}

/**
 * Criptografa múltiplos dados de uma vez (para login)
 */
export async function encryptLoginData(email: string, password: string, remember: boolean): Promise<{
  emailData: { key: string; value: string }
  passwordData: { key: string; value: string }
  rememberData: { key: string; value: string }
}> {
  try {
    const [emailResult, passwordResult, rememberResult] = await Promise.all([
      setSecureData('email', email),
      setSecureData('password', password),
      setSecureData('remember', remember.toString())
    ])
    
    return {
      emailData: { 
        key: emailResult.encryptedKey, 
        value: emailResult.encryptedValue 
      },
      passwordData: { 
        key: passwordResult.encryptedKey, 
        value: passwordResult.encryptedValue 
      },
      rememberData: { 
        key: rememberResult.encryptedKey, 
        value: rememberResult.encryptedValue 
      }
    }
  } catch (error) {
    console.error('Erro ao criptografar dados de login:', error)
    throw new Error('Erro ao processar dados de login')
  }
}

/**
 * Descriptografa múltiplos dados de uma vez (para carregamento)
 */
export async function decryptLoginData(emailValue: string, passwordValue: string, rememberValue: string): Promise<{
  email: string
  password: string
  remember: boolean
}> {
  try {
    const [email, password, remember] = await Promise.all([
      decryptData(emailValue),
      decryptData(passwordValue),
      decryptData(rememberValue)
    ])
    
    return {
      email,
      password,
      remember: remember === 'true'
    }
  } catch (error) {
    console.error('Erro ao descriptografar dados de login:', error)
    return {
      email: '',
      password: '',
      remember: false
    }
  }
}