import os
import redis
from dotenv import load_dotenv

load_dotenv()

class BufferService:
    def __init__(self):
        # Pega a URL do Redis do .env ou usa o padrão do Docker
        redis_url = os.getenv("CACHE_REDIS_URI")

        self.client = redis.from_url(redis_url, decode_responses=True)
        # Tempo do Lock = Tempo do Buffer + Margem de segurança (2s)
        self.LOCK_TTL = 12 

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