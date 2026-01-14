import os
import redis
from dotenv import load_dotenv

load_dotenv()

class BufferService:
    def __init__(self):
        # Pega a URL do Redis do .env ou usa o padrão do Docker
        redis_url = os.getenv("CACHE_REDIS_URI")

        self.client = redis.from_url(redis_url, decode_responses=True)
        # Tempo do Lock = Tempo do Buffer + Margem de segurança (10s)
        self.LOCK_TTL = 20 

    def add_message(self, clinic_id: str, phone: str, message: str):
        """
        Adiciona a mensagem na lista do Redis.
        """
        key = f"buffer:msgs:{clinic_id}:{phone}"
        self.client.rpush(key, message)
        # Expira em 1 hora para não deixar lixo se der erro
        self.client.expire(key, 3600)

    def should_start_timer(self, clinic_id: str, phone: str) -> bool:
        """
        Tenta adquirir o 'cadeado' para iniciar o timer.
        Retorna True se você for o primeiro (deve iniciar o timer).
        Retorna False se já existe um timer rodando (apenas ignore).
        """
        key = f"buffer:lock:{clinic_id}:{phone}"
        
        # setnx (Set if Not Exists) é atômico.
        # Só retorna True se a chave NÃO existia.
        acquired = self.client.setnx(key, "processing")
        
        if acquired:
            # Se conseguiu o lock, define o tempo que ele vai durar (o tempo do buffer)
            self.client.expire(key, self.LOCK_TTL)
            return True
            
        return False

    def get_and_clear_messages(self, clinic_id: str, phone: str) -> str:
        """
        Pega todas as mensagens acumuladas, junta e limpa.
        """
        key = f"buffer:msgs:{clinic_id}:{phone}"
        lock_key = f"buffer:lock:{clinic_id}:{phone}"
        
        # Pega todas as mensagens da lista (0 a -1)
        messages = self.client.lrange(key, 0, -1)
        
        if not messages:
            return None
            
        # Limpa o buffer e o lock
        self.client.delete(key)
        self.client.delete(lock_key)
        
        # Junta as mensagens com ponto final para a IA entender a separação
        return ". ".join(messages)
    
    # --- CACHE DE DISPONIBILIDADE ---
    
    def get_cached_availability(self, profissional_id: str, data: str):
        """
        Busca slots livres no cache para um profissional em uma data específica.
        
        Args:
            profissional_id: ID do profissional
            data: Data no formato DD/MM/AAAA
            
        Returns:
            Lista de slots livres (ex: ["08:00", "09:00", "14:00"]) ou None se não houver cache
        """
        key = f"cache:availability:{profissional_id}:{data}"
        
        try:
            cached_data = self.client.get(key)
            
            if cached_data:
                print(f"✅ [Cache HIT] Disponibilidade encontrada: {profissional_id} - {data}")
                # Converte string JSON de volta para lista
                import json
                return json.loads(cached_data)
            else:
                print(f"❌ [Cache MISS] Disponibilidade não encontrada: {profissional_id} - {data}")
                return None
                
        except Exception as e:
            print(f"⚠️ Erro ao buscar cache: {e}")
            return None
    
    def set_cached_availability(self, profissional_id: str, data: str, slots_livres: list, ttl: int = 300):
        """
        Armazena slots livres no cache com TTL (Time To Live).
        
        Args:
            profissional_id: ID do profissional
            data: Data no formato DD/MM/AAAA
            slots_livres: Lista de horários livres (ex: ["08:00", "09:00"])
            ttl: Tempo de vida em segundos (padrão: 300s = 5 minutos)
        """
        key = f"cache:availability:{profissional_id}:{data}"
        
        try:
            import json
            # Serializa a lista para JSON
            self.client.setex(key, ttl, json.dumps(slots_livres))
            print(f"💾 [Cache SET] Armazenado: {profissional_id} - {data} (TTL: {ttl}s)")
            
        except Exception as e:
            print(f"⚠️ Erro ao salvar cache: {e}")
    
    def invalidate_availability_cache(self, profissional_id: str, data: str):
        """
        Invalida o cache de disponibilidade para um profissional em uma data específica.
        Deve ser chamado sempre que houver agendamento, cancelamento ou reagendamento.
        
        Args:
            profissional_id: ID do profissional
            data: Data no formato DD/MM/AAAA
        """
        key = f"cache:availability:{profissional_id}:{data}"
        
        try:
            deleted = self.client.delete(key)
            
            if deleted:
                print(f"🗑️ [Cache INVALIDATED] Removido cache: {profissional_id} - {data}")
            else:
                print(f"ℹ️ [Cache] Nenhum cache para invalidar: {profissional_id} - {data}")
                
        except Exception as e:
            print(f"⚠️ Erro ao invalidar cache: {e}")