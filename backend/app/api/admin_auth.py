"""
Rotas de autenticação para o painel administrativo.
Frontend faz login aqui para obter JWT token.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from datetime import timedelta
from app.core.jwt_auth import (
    authenticate_admin, 
    create_access_token,
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


@router.post("/admin/login", response_model=LoginResponse)
def admin_login(credentials: LoginRequest):
    """
    Rota de login para o painel administrativo.
    
    O frontend envia username/password e recebe um JWT token.
    Esse token deve ser incluído em todas as requisições subsequentes.
    
    **Exemplo de uso:**
    ```bash
    curl -X POST http://localhost:8000/admin/login \
         -H "Content-Type: application/json" \
         -d '{"username": "admin", "password": "admin123"}'
    ```
    
    **Resposta:**
    ```json
    {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "bearer",
        "expires_in": 1800
    }
    ```
    
    **Como usar o token nas próximas requisições:**
    ```bash
    curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
         http://localhost:8000/admin/rate-limit/stats
    ```
    """
    # Autentica o usuário
    if not authenticate_admin(credentials.username, credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Cria o token JWT
    access_token_expires = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": credentials.username},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60  # em segundos
    }


@router.post("/admin/logout")
def admin_logout():
    """
    Rota de logout (placeholder).
    
    Com JWT, o logout é feito no frontend removendo o token.
    Opcionalmente, pode-se implementar uma blacklist de tokens.
    """
    return {
        "success": True,
        "message": "Logout realizado. Remova o token do seu storage."
    }
