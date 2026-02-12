
import datetime as dt
from dateutil.relativedelta import relativedelta
from app.core.database import get_supabase

def renovar_tokens_diario():
    """
    Job agendado para rodar diariamente (ex: 06:00).
    Verifica se alguma clínica com plano ANUAL virou o mês e reseta o saldo de tokens.
    Otimizado para fazer 1 query única.
    """
    print(f"--- 🔄 JOB: Verificando renovação de tokens ANUAIS ({dt.datetime.now()}) ---", flush=True)
    
    supabase = get_supabase()
    
    try:
        # 1. Buscar assinaturas ATIVAS de planos ANUAIS com JOIN
        # Filtramos por ciclo contendo 'anual', 'annual' ou 'YEARLY' (case insensitive se possível, mas aqui via Python ou ilike)
        # Supabase-py join syntax: table(col,col,foreign_table(col))
        
        subs_res = supabase.table('assinaturas')\
            .select('id, clinic_id, data_inicio, status, ciclo, ultima_recarga_tokens, planos!inner(max_tokens), clinicas!inner(saldo_tokens)')\
            .eq('status', 'ativa')\
            .in_('ciclo', ['anual', 'annual', 'YEARLY', 'yearly'])\
            .execute()
            
        if not subs_res.data:
            print("Nenhuma assinatura anual ativa encontrada.", flush=True)
            return
            
        assinaturas = subs_res.data
        count_renovados = 0
        
        for sub in assinaturas:
            clinic_id = sub['clinic_id']
            # Access nested data safely
            plano_data = sub.get('planos')
            max_tokens = plano_data.get('max_tokens') if plano_data else None
            
            if not max_tokens:
                continue
                
            # Parse data inicio
            try:
                # Tratar timezone Z
                data_inicio = dt.datetime.fromisoformat(sub['data_inicio'].replace('Z', '+00:00'))
            except:
                continue 
                
            # Agora com timezone UTC se data_inicio tiver
            agora = dt.datetime.now(dt.timezone.utc) if data_inicio.tzinfo else dt.datetime.now()
            
            # --- LÓGICA DE CICLO MENSAL ---
            # Calcular o início do ciclo ATUAL (mês corrente deste ano) - ZERANDO A HORA (00:00)
            # Isso garante que a renovação aconteça no dia correto, independentemente da hora que o usuário assinou
            try:
                ciclo_atual_inicio = agora.replace(day=data_inicio.day, hour=0, minute=0, second=0, microsecond=0)
            except ValueError:
                # Fallback dia 31 etc
                ciclo_atual_inicio = agora.replace(day=1, hour=0, minute=0, second=0, microsecond=0) + relativedelta(months=1) - relativedelta(days=1)

            # Se ainda não passou o aniversário deste mês (data < hoje), o ciclo vigente começou mês passado
            # Como zeramos a hora, hoje 06:00 > hoje 00:00, então ok.

            # --- VERIFICAÇÃO COM ULTIMA_RECARGA_TOKENS (DA ASSINATURA) ---
            should_reset = False
            ultima_recarga_str = sub.get('ultima_recarga_tokens')
            
            if ultima_recarga_str:
                try:
                    ultima_recarga = dt.datetime.fromisoformat(ultima_recarga_str.replace('Z', '+00:00'))

                    if ultima_recarga < ciclo_atual_inicio:
                        should_reset = True
                except:
                    pass
            
            if should_reset:
                print(f"   -> Renovando Tokens Clínica {clinic_id} (Ciclo: {ciclo_atual_inicio}) -> {max_tokens}", flush=True)
                
                # Executar Updates
                # 1. Resetar saldo na clinica
                supabase.table('clinicas').update({
                    'saldo_tokens': max_tokens
                }).eq('id', clinic_id).execute()
                
                # 2. Marcar recarga na assinatura
                # Usamos o momento atual em UTC/ISO
                supabase.table('assinaturas').update({
                    'ultima_recarga_tokens': agora.isoformat()
                }).eq('id', sub['id']).execute()
                
                count_renovados += 1
                
        print(f"--- ✅ JOB FINALIZADO: {count_renovados} clínicas renovadas. ---", flush=True)
        
    except Exception as e:
        print(f"❌ Erro no Job de Renovação de Tokens: {e}", flush=True)
