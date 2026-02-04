"""
Sistema de Rate Limiting Multi-Tenant para proteger a API contra abuso.

Implementa 3 camadas de proteção:
1. Rate Limit por Clínica (baseado no plano de assinatura)
2. Burst Protection (10 requisições/10 segundos)
3. Rate Limit Global (1000 requisições/minuto total)

Suporta 3 planos de assinatura com limites diferentes.
"""

import os
import time
from typing import Optional, Tuple, Dict
from dotenv import load_dotenv
from app.services.buffer_service import BufferService
from app.core.database import get_supabase

load_dotenv()


class RateLimiter:
    def __init__(self):
        """
        Inicializa o Rate Limiter usando Redis do BufferService.
        Suporta limites personalizados por plano de assinatura.
        """
        self.buffer_service = BufferService()
        self.redis = self.buffer_service.client
        self.supabase = get_supabase()
        
        # Configurações globais (não dependem do plano)
        self.BURST_LIMIT = int(os.getenv("RATE_LIMIT_BURST", "50"))
        self.BURST_WINDOW = int(os.getenv("RATE_LIMIT_BURST_WINDOW", "10"))
        self.GLOBAL_RATE_LIMIT = int(os.getenv("RATE_LIMIT_GLOBAL", "10000"))
        self.BLOCK_DURATION = int(os.getenv("RATE_LIMIT_BLOCK_DURATION", "60"))
        self.VIOLATION_THRESHOLD = int(os.getenv("RATE_LIMIT_VIOLATION_THRESHOLD", "5"))
        self.VIOLATION_WINDOW = int(os.getenv("RATE_LIMIT_VIOLATION_WINDOW", "300"))
        
        # Limites padrão por plano (fallback se não estiver no banco)
        self.DEFAULT_PLAN_LIMITS = {
            "trial": 60,
            "consultorio": 60,   # Plano Consultório: 60 req/min
            "clinica_pro": 180,   # Plano Clínica Pro: 180 req/min
            "corporate": 300     # Plano Corporate: 300 req/min
        }
        
        # Cache de limites de clínicas (para evitar consultas repetidas ao banco)
        self._clinic_limits_cache: Dict[str, Tuple[int, float]] = {}  # {clinic_id: (limit, timestamp)}
        self._cache_ttl = 300  # Cache por 5 minutos
    
    def _get_clinic_rate_limit(self, clinic_id: str) -> int:
        """
        Busca o limite de rate para uma clínica baseado no seu plano de assinatura.
        Usa cache para evitar consultas repetidas ao banco.
        
        Returns:
            int: Limite de requisições por minuto
        """
        # Verifica cache
        if clinic_id in self._clinic_limits_cache:
            limit, cached_at = self._clinic_limits_cache[clinic_id]
            if time.time() - cached_at < self._cache_ttl:
                return limit
        
        try:
            # 1. Busca assinatura ativa com join na tabela planos
            # Sintaxe: select('colunas_assinatura, tabela_relacionada(colunas_tabela)')
            response = self.supabase.table('assinaturas')\
                .select('plan_id, planos(nome)')\
                .eq('clinic_id', clinic_id)\
                .eq('status', 'ativa')\
                .single()\
                .execute()
            
            plano_nome = 'consultorio'
            
            if response.data and response.data.get('planos'):
                plano_data = response.data.get('planos')

                if plano_data and isinstance(plano_data, dict):
                    plano_nome = plano_data.get('nome', 'consultorio').lower()
                elif plano_data and isinstance(plano_data, list) and len(plano_data) > 0:
                    plano_nome = plano_data[0].get('nome', 'consultorio').lower()
            
            limit = self.DEFAULT_PLAN_LIMITS.get(plano_nome, self.DEFAULT_PLAN_LIMITS['consultorio'])
            
            # Armazena no cache
            self._clinic_limits_cache[clinic_id] = (limit, time.time())
            
            return limit
                
        except Exception as e:
            print(f"⚠️ [RateLimit] Erro ao buscar plano da clínica {clinic_id}: {e}")
        
        # Fallback: plano básico
        return self.DEFAULT_PLAN_LIMITS['consultorio']
    
    def _get_current_minute(self) -> int:
        """Retorna o timestamp do minuto atual (para janelas deslizantes)."""
        return int(time.time() // 60)
    
    def _get_current_burst_window(self) -> int:
        """Retorna o timestamp da janela de burst atual."""
        return int(time.time() // self.BURST_WINDOW)
    
    def check_rate_limit_per_clinic(self, clinic_id: str) -> Tuple[bool, Optional[str]]:
        """
        Verifica o rate limit por clínica baseado no plano de assinatura.
        
        Returns:
            (allowed: bool, message: Optional[str])
        """
        current_minute = self._get_current_minute()
        key = f"ratelimit:clinic:{clinic_id}:minute:{current_minute}"
        
        try:
            # Busca limite do plano da clínica
            clinic_limit = self._get_clinic_rate_limit(clinic_id)
            
            # Incrementa contador atomicamente
            count = self.redis.incr(key)
            
            # Define expiração na primeira requisição
            if count == 1:
                self.redis.expire(key, 120)  # 2 minutos para garantir
            
            if count > clinic_limit:
                print(f"⚠️ [RateLimit] Clínica {clinic_id} excedeu limite do plano: {count}/{clinic_limit}")
                
                # Registra violação
                self.record_violation(clinic_id)
                
                return False, f"Rate limit excedido: {count}/{clinic_limit} req/min (plano)"
            
            return True, None
            
        except Exception as e:
            print(f"❌ [RateLimit] Erro ao verificar rate limit: {e}")
            return True, None  # Fail open: em caso de erro, permite a requisição
    
    def check_burst_protection(self, clinic_id: str) -> Tuple[bool, Optional[str]]:
        """
        Verifica proteção contra burst (10 req/10s).
        
        Returns:
            (allowed: bool, message: Optional[str])
        """
        current_window = self._get_current_burst_window()
        key = f"ratelimit:clinic:{clinic_id}:burst:{current_window}"
        
        try:
            count = self.redis.incr(key)
            
            if count == 1:
                self.redis.expire(key, self.BURST_WINDOW * 2)
            
            if count > self.BURST_LIMIT:
                print(f"⚠️ [RateLimit] Burst detectado - Clínica {clinic_id}: {count}/{self.BURST_LIMIT}")
                return False, f"Burst limit excedido: {count}/{self.BURST_LIMIT} req/10s"
            
            return True, None
            
        except Exception as e:
            print(f"❌ [RateLimit] Erro ao verificar burst: {e}")
            return True, None
    
    def check_global_rate_limit(self) -> Tuple[bool, Optional[str]]:
        """
        Verifica rate limit global (1000 req/min total).
        
        Returns:
            (allowed: bool, message: Optional[str])
        """
        current_minute = self._get_current_minute()
        key = f"ratelimit:global:minute:{current_minute}"
        
        try:
            count = self.redis.incr(key)
            
            if count == 1:
                self.redis.expire(key, 120)
            
            if count > self.GLOBAL_RATE_LIMIT:
                print(f"🚨 [RateLimit] GLOBAL LIMIT ATINGIDO: {count}/{self.GLOBAL_RATE_LIMIT}")
                return False, f"Sistema em alta carga. Tente novamente em instantes."
            
            return True, None
            
        except Exception as e:
            print(f"❌ [RateLimit] Erro ao verificar rate limit global: {e}")
            return True, None
    
    def record_violation(self, clinic_id: str):
        """
        Registra uma violação de rate limit e bloqueia após threshold.
        """
        key = f"ratelimit:violations:{clinic_id}"
        
        try:
            # Incrementa contador de violações
            violations = self.redis.incr(key)
            
            # Define expiração na primeira violação
            if violations == 1:
                self.redis.expire(key, self.VIOLATION_WINDOW)
            
            # Bloqueia se atingiu o threshold
            if violations >= self.VIOLATION_THRESHOLD:
                self.block_clinic_temporarily(clinic_id)
                print(f"🚫 [RateLimit] Clínica {clinic_id} BLOQUEADA após {violations} violações")
                
        except Exception as e:
            print(f"❌ [RateLimit] Erro ao registrar violação: {e}")
    
    def block_clinic_temporarily(self, clinic_id: str):
        """
        Bloqueia uma clínica temporariamente (5 minutos).
        """
        key = f"ratelimit:blocked:{clinic_id}"
        
        try:
            self.redis.setex(key, self.BLOCK_DURATION, "blocked")
            print(f"🚫 [RateLimit] Clínica {clinic_id} bloqueada por {self.BLOCK_DURATION}s")
            
        except Exception as e:
            print(f"❌ [RateLimit] Erro ao bloquear clínica: {e}")
    
    def is_clinic_blocked(self, clinic_id: str) -> Tuple[bool, Optional[int]]:
        """
        Verifica se uma clínica está bloqueada.
        
        Returns:
            (blocked: bool, ttl_seconds: Optional[int])
        """
        key = f"ratelimit:blocked:{clinic_id}"
        
        try:
            blocked = self.redis.exists(key)
            
            if blocked:
                ttl = self.redis.ttl(key)
                print(f"🚫 [RateLimit] Clínica {clinic_id} está bloqueada (TTL: {ttl}s)")
                return True, ttl
            
            return False, None
            
        except Exception as e:
            print(f"❌ [RateLimit] Erro ao verificar bloqueio: {e}")
            return False, None
    
    def unblock_clinic(self, clinic_id: str) -> bool:
        """
        Remove bloqueio de uma clínica manualmente (admin).
        
        Returns:
            bool: True se removeu, False se não estava bloqueada
        """
        key = f"ratelimit:blocked:{clinic_id}"
        violations_key = f"ratelimit:violations:{clinic_id}"
        
        try:
            deleted_block = self.redis.delete(key)
            self.redis.delete(violations_key)
            
            if deleted_block:
                print(f"✅ [RateLimit] Clínica {clinic_id} desbloqueada manualmente")
                return True
            
            return False
            
        except Exception as e:
            print(f"❌ [RateLimit] Erro ao desbloquear clínica: {e}")
            return False
    
    def get_clinic_stats(self, clinic_id: str) -> dict:
        """
        Retorna estatísticas de rate limit de uma clínica incluindo informações do plano.
        """
        current_minute = self._get_current_minute()
        current_window = self._get_current_burst_window()
        
        minute_key = f"ratelimit:clinic:{clinic_id}:minute:{current_minute}"
        burst_key = f"ratelimit:clinic:{clinic_id}:burst:{current_window}"
        blocked_key = f"ratelimit:blocked:{clinic_id}"
        violations_key = f"ratelimit:violations:{clinic_id}"
        
        try:
            # Busca dados do Redis
            minute_count = int(self.redis.get(minute_key) or 0)
            burst_count = int(self.redis.get(burst_key) or 0)
            blocked = self.redis.exists(blocked_key)
            violations = int(self.redis.get(violations_key) or 0)
            
            # Busca limite do plano
            clinic_limit = self._get_clinic_rate_limit(clinic_id)
            
            # Busca informações do plano no banco
            plano_nome = "consultorio"
            try:
                response = self.supabase.table('clinicas')\
                    .select('plano')\
                    .eq('id', clinic_id)\
                    .single()\
                    .execute()
                if response.data:
                    plano_nome = response.data.get('plano', 'consultorio')
            except:
                pass
            
            return {
                "clinic_id": clinic_id,
                "plano": plano_nome,
                "requests_this_minute": minute_count,
                "requests_this_burst": burst_count,
                "blocked": bool(blocked),
                "violations": violations,
                "limits": {
                    "per_minute": clinic_limit,
                    "burst": self.BURST_LIMIT
                },
                "usage_percentage": round((minute_count / clinic_limit) * 100, 2) if clinic_limit > 0 else 0
            }
            
        except Exception as e:
            print(f"❌ [RateLimit] Erro ao obter stats: {e}")
            return {}
    
    def get_global_stats(self) -> dict:
        """
        Retorna estatísticas globais de rate limit.
        """
        current_minute = self._get_current_minute()
        global_key = f"ratelimit:global:minute:{current_minute}"
        
        try:
            global_count = int(self.redis.get(global_key) or 0)
            
            return {
                "global_requests_this_minute": global_count,
                "global_limit": self.GLOBAL_RATE_LIMIT,
                "usage_percentage": round((global_count / self.GLOBAL_RATE_LIMIT) * 100, 2)
            }
            
        except Exception as e:
            print(f"❌ [RateLimit] Erro ao obter stats globais: {e}")
            return {}


# Instância global
rate_limiter = RateLimiter()
