import time
import schedule
from app.services.reminder_service import processar_lembretes

print("--- INICIANDO SERVIÇO DE AGENDAMENTO (REMINDERS) ---")

# Roda imediatamente ao iniciar para testar
processar_lembretes()

# Configura para rodar a cada 10 minutos
schedule.every(10).minutes.do(processar_lembretes)

while True:
  schedule.run_pending()
  time.sleep(1)