import requests
import uuid

# --- CONFIGURAÇÃO ---
BASE_URL = "http://localhost:8000"
# ⚠️ PEGUE UM ID VÁLIDO NA SUA TABELA 'clinicas' DO SUPABASE ⚠️
CLINIC_ID_TESTE = "fd2faa18-32be-4393-a31a-c424fe26d89c" 

# Simulando um número de WhatsApp (Use um que não esteja no banco para testar cadastro)
SESSION_ID_TESTE = "5511999991234" 

def chat_loop():
    print(f"--- INICIANDO SIMULAÇÃO DE CHAT (Clínica: {CLINIC_ID_TESTE}) ---")
    print(f"Paciente (Simulado): {SESSION_ID_TESTE}")
    print("Digite 'sair' para encerrar.\n")

    while True:
        # 1. Você digita a mensagem no terminal
        user_input = input("\nVocê: ")
        
        if user_input.lower() in ['sair', 'exit']:
            break

        # 2. Envia para o seu Backend (FastAPI)
        payload = {
            "clinic_id": CLINIC_ID_TESTE,
            "session_id": SESSION_ID_TESTE,
            "message": user_input
        }

        try:
            response = requests.post(f"{BASE_URL}/chat", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                # 3. Imprime a resposta da IA
                print(f"🤖 IA: {data.get('response')}")
            else:
                print(f"❌ Erro {response.status_code}: {response.text}")

        except Exception as e:
            print(f"❌ Erro de conexão: {e}")
            print("O servidor (uvicorn) está rodando?")
            break

if __name__ == "__main__":
    chat_loop()