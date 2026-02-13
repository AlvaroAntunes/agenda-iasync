"use server";

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