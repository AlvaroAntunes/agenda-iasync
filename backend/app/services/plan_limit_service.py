import time
from app.core.database import get_supabase, SupabaseClient

def enforce_professional_limit(clinic_id: str, plan_id: str):
    """
    Verifica o limite de profissionais do novo plano e remove
    os excedentes (mais recentes) se necessário.
    """
    MAX_RETRIES = 3
    retry_delay = 0.5
    
    for attempt in range(MAX_RETRIES):
        supabase = get_supabase()
        try:
            # 1. Buscar limite do plano
            plan_res = supabase.table('planos')\
                .select('max_profissionais')\
                .eq('id', plan_id)\
                .maybe_single()\
                .execute()
                
            if not plan_res or not plan_res.data:
                print(f"⚠️ Plano {plan_id} não encontrado ao verificar limites.")
                return
                
            max_pros = plan_res.data.get('max_profissionais')
            
            # Se max_pros for None (ilimitado), ignoramos
            if max_pros is None:
                return

            # 2. Buscar profissionais atuais
            pros_res = supabase.table('profissionais')\
                .select('*')\
                .eq('clinic_id', clinic_id)\
                .order('created_at', desc=True)\
                .execute()
                
            if not pros_res or pros_res.data is None:
                return

            current_pros = pros_res.data
            count = len(current_pros)
            
            if count > max_pros:
                excess = count - max_pros
                print(f"✂️ Limite excedido: {count}/{max_pros}. Removendo {excess} profissionais mais recentes...")
                
                # Os X primeiros da lista (que está ordenada por created_at desc) são os mais recentes
                pros_to_remove = current_pros[:excess]
                ids_to_remove = [p['id'] for p in pros_to_remove]
                
                # 3. Remover excedentes
                supabase.table('profissionais')\
                    .delete()\
                    .in_('id', ids_to_remove)\
                    .execute()
                    
                print(f"✅ {len(ids_to_remove)} profissionais removidos com sucesso.")
            
            # Se deu certo, sai do loop
            return

        except Exception as e:
            msg = str(e)
            print(f"⚠️ [Tentativa {attempt+1}/{MAX_RETRIES}] Erro ao aplicar limite: {msg}")
            
            if "Server disconnected" in msg or "Connection refused" in msg or "RemoteProtocolError" in msg:
                if attempt < MAX_RETRIES - 1:
                    SupabaseClient.reset_client() # Limpa o singleton para a próxima tentativa
                    time.sleep(retry_delay)
                    continue
            
            # Se não for erro de conexão ou última tentativa, apenas registra
            print(f"❌ Falha final ao aplicar limite de profissionais: {e}")
            break
