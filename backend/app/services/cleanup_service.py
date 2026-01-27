import os
import datetime as dt
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from app.core.database import get_supabase

load_dotenv()

supabase = get_supabase()

def limpar_checkouts_antigos():
    """
    Remove intenções de compra (checkouts) inválidas.
    Critérios:
    1. Status é 'pendente' ou 'expirado'.
    2. E (Criado há mais de 7 dias OU Data de Vencimento já passou).
    """
    print("🧹 [Cleanup] Iniciando limpeza de dados antigos...")
    
    # Data de referência 1: 7 dias atrás (para segurança de registros sem vencimento)
    agora_utc = dt.datetime.now(dt.timezone.utc)
    data_limite_criacao = agora_utc - dt.timedelta(days=7)
    data_limite_iso = data_limite_criacao.isoformat()

    # Data de referência 2: Hoje (para verificar vencimento)
    hoje_iso = dt.date.today().isoformat()

    try:
        # Executa a limpeza com lógica composta
        # .in_ -> Status deve ser um desses
        # .or_ -> (criado < 7 dias ATRÁS) OU (vencimento < HOJE)
        response = supabase.table('checkout_sessions')\
            .delete()\
            .in_('status', ['pendente', 'expirado'])\
            .or_(f"created_at.lt.{data_limite_iso},data_vencimento.lt.{hoje_iso}")\
            .execute()
        
        qtd_deletada = len(response.data) if response.data else 0
        
        if qtd_deletada > 0:
            print(f"   🗑️ Removidas {qtd_deletada} sessões vencidas ou abandonadas.")
        else:
            print("   ✅ Nenhuma sessão para limpar hoje.")

    except Exception as e:
        print(f"❌ Erro na limpeza de dados: {e}")