"use server"

import { 
  encryptLoginData, 
  decryptLoginData, 
  getSecureData 
} from './crypto-utils'

/**
 * Salva dados de login criptografados
 */
export async function saveLoginData(email: string, password: string, remember: boolean) {
  try {
    if (!remember) {
      return {
        success: true,
        data: null,
        message: 'Dados não salvos (lembrar de mim desmarcado)'
      }
    }

    const encryptedData = await encryptLoginData(email, password, remember)
    
    return {
      success: true,
      data: encryptedData,
      message: 'Dados salvos com segurança'
    }
  } catch (error: any) {
    console.error('Erro ao salvar dados de login:', error)
    return {
      success: false,
      data: null,
      message: error.message || 'Erro ao salvar dados'
    }
  }
}

/**
 * Carrega dados de login salvos
 */
export async function loadLoginData(
  emailValue?: string, 
  passwordValue?: string, 
  rememberValue?: string
) {
  try {
    if (!emailValue || !passwordValue || !rememberValue) {
      return {
        success: true,
        data: { email: '', password: '', remember: false },
        message: 'Nenhum dado salvo encontrado'
      }
    }

    const decryptedData = await decryptLoginData(emailValue, passwordValue, rememberValue)
    
    return {
      success: true,
      data: decryptedData,
      message: 'Dados carregados com sucesso'
    }
  } catch (error: any) {
    console.error('Erro ao carregar dados de login:', error)
    return {
      success: false,
      data: { email: '', password: '', remember: false },
      message: 'Erro ao carregar dados salvos'
    }
  }
}

/**
 * Limpa dados salvos (retorna chaves para remover)
 */
export async function clearLoginData(
  emailKey?: string,
  passwordKey?: string, 
  rememberKey?: string
) {
  try {
    const keysToRemove = []
    if (emailKey) keysToRemove.push(emailKey)
    if (passwordKey) keysToRemove.push(passwordKey)
    if (rememberKey) keysToRemove.push(rememberKey)
    
    return {
      success: true,
      keysToRemove,
      message: 'Chaves identificadas para remoção'
    }
  } catch (error: any) {
    console.error('Erro ao limpar dados de login:', error)
    return {
      success: false,
      keysToRemove: [],
      message: 'Erro ao processar limpeza'
    }
  }
}