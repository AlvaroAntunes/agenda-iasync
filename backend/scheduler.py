import time
import schedule
from app.services.reminder_service import processar_lembretes
from app.services.cleanup_service import limpar_checkouts_antigos

print("--- INICIANDO SERVIÇO DE AGENDAMENTO (SCHEDULER) ---", flush=True)

# --- 1. TAREFAS DE INICIALIZAÇÃO (Teste Rápido) ---
# Executa uma vez ao iniciar para garantir que o código não tem erros de sintaxe ou conexão
try:
    print("running startup checks...", flush=True)
except Exception as e:
    print(f"❌ Erro na execução inicial: {e}", flush=True)

# --- 2. CONFIGURAÇÃO DO AGENDAMENTO ---

# Lembretes: Roda a cada 10 minutos (Fundamental para avisar 24h/2h antes)
schedule.every(10).minutes.do(processar_lembretes)

# Limpeza: Roda todo dia às 04:00 da manhã
# Limpa checkouts pendentes há mais de 7 dias ou vencidos
schedule.every().day.at("04:00").do(limpar_checkouts_antigos)

print("✅ Scheduler ativo e aguardando horários...", flush=True)

# --- 3. LOOP INFINITO ---
while True:
    try:
        schedule.run_pending()
    except Exception as e:
        # Se uma tarefa falhar, loga o erro mas NÃO mata o container
        print(f"❌ Erro no loop do scheduler: {e}", flush=True)
    
    time.sleep(1)