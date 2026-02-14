"use server";

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const API_GLOBAL_PASSWORD = process.env.API_GLOBAL_PASSWORD; 

type FetchOptions = {
  method?: string;
  body?: any;
};

// Esta função substitui o seu 'fetchWithAuth'
export async function serverFetch(url: string, options: FetchOptions = {}) {
  try {
    // A chave é injetada AQUI, no servidor. O navegador nunca vê isso.
    const headers = {
      "Content-Type": "application/json",
      "x-api-password": API_GLOBAL_PASSWORD || "",
    };

    const response = await fetch(url, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store' ,
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.statusText}`);
    }

    const data = await response.json();
    return { ok: true, data };

  } catch (error: any) {
    console.error("Erro no serverFetch:", error);
    return { ok: false, error: error.message };
  }
}

// Função específica para construir URL SSE com autenticação
export async function getSSEUrl(baseUrl: string, clinicId: string) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado')
    }

    const url = new URL(baseUrl)
    url.pathname = `/sse/clinics/${clinicId}`
    url.searchParams.set('token', session.access_token)
    
    return { ok: true, url: url.toString() }
    
  } catch (error: any) {
    console.error("Erro ao construir URL SSE:", error)
    return { ok: false, error: error.message }
  }
}