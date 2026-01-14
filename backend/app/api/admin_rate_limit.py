"""
Endpoints administrativos para monitoramento de Rate Limiting.
"""

from fastapi import APIRouter, HTTPException, Depends
from app.core.rate_limiter import rate_limiter
from app.core.database import get_supabase
from app.core.jwt_auth import require_admin

router = APIRouter()
supabase = get_supabase()

@router.get("/admin/rate-limit/stats")
def get_rate_limit_stats(
    clinic_id: str = None,
    user: dict = Depends(require_admin)
):
    """
    Retorna estatísticas de rate limiting.
    Se clinic_id for fornecido, retorna stats específicas.
    Caso contrário, retorna stats globais.
    
    **Autenticação obrigatória:** Envie header `Authorization: Bearer {token}`
    """
    try:
        stats = {
            "success": True,
            "stats": {}
        }
        
        # Stats globais
        global_stats = rate_limiter.get_global_stats()
        stats["stats"]["global"] = global_stats
        
        # Stats da clínica específica
        if clinic_id:
            clinic_stats = rate_limiter.get_clinic_stats(clinic_id)
            stats["stats"]["clinic"] = clinic_stats
        
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/rate-limit/blocked")
def list_blocked_clinics(user: dict = Depends(require_admin)):
    """
    Lista todas as clínicas atualmente bloqueadas.
    
    **Autenticação obrigatória:** Envie header `Authorization: Bearer {token}`
    """
    try:
        # Busca todas as clínicas no banco
        clinicas = supabase.table('clinicas').select('id, nome').execute()
        
        blocked_clinics = []
        
        for clinic in clinicas.data:
            is_blocked, ttl = rate_limiter.is_clinic_blocked(clinic['id'])
            
            if is_blocked:
                blocked_clinics.append({
                    "clinic_id": clinic['id'],
                    "clinic_name": clinic.get('nome', 'N/A'),
                    "time_remaining_seconds": ttl
                })
        
        return {
            "success": True,
            "total": len(blocked_clinics),
            "blocked_clinics": blocked_clinics
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/rate-limit/top-users")
def get_top_users(
    limit: int = 10,
    user: dict = Depends(require_admin)
):
    """
    Retorna as clínicas com maior número de requisições no minuto atual.
    
    **Autenticação obrigatória:** Envie header `Authorization: Bearer {token}`
    """
    try:
        # Busca todas as clínicas
        clinicas = supabase.table('clinicas').select('id, nome').execute()
        
        usage_data = []
        
        for clinic in clinicas.data:
            stats = rate_limiter.get_clinic_stats(clinic['id'])
            
            if stats.get('requests_this_minute', 0) > 0:
                usage_data.append({
                    "clinic_id": clinic['id'],
                    "clinic_name": clinic.get('nome', 'N/A'),
                    "requests_this_minute": stats['requests_this_minute'],
                    "limit": stats['limits']['per_minute']
                })
        
        # Ordena por número de requisições (maior primeiro)
        usage_data.sort(key=lambda x: x['requests_this_minute'], reverse=True)
        
        # Limita o resultado
        top_users = usage_data[:limit]
        
        return {
            "success": True,
            "top_users": top_users
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/rate-limit/unblock/{clinic_id}")
def unblock_clinic(
    clinic_id: str,
    user: dict = Depends(require_admin)
):
    """
    Remove o bloqueio de uma clínica manualmente.
    
    **Autenticação obrigatória:** Envie header `Authorization: Bearer {token}`
    """
    try:
        success = rate_limiter.unblock_clinic(clinic_id)
        
        if success:
            return {
                "success": True,
                "message": f"Clínica {clinic_id} desbloqueada com sucesso"
            }
        else:
            return {
                "success": False,
                "message": f"Clínica {clinic_id} não estava bloqueada"
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
