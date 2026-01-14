"""
Sistema de autenticação JWT para rotas administrativas.
Em produção, apenas o frontend autorizado terá acesso.
"""

import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Configurações JWT
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "sua-chave-jwt-super-secreta-min-32-caracteres-aqui-12345")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Credenciais admin (em produção, buscar do banco)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# Contexto para hash de senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token security
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha corresponde ao hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Gera hash da senha"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Cria um token JWT com os dados fornecidos.
    
    Args:
        data: Dados a serem incluídos no token (ex: {"sub": "admin"})
        expires_delta: Tempo de expiração customizado
    
    Returns:
        Token JWT assinado
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow()
    })
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """
    Verifica e decodifica um token JWT.
    
    Args:
        token: Token JWT a ser verificado
    
    Returns:
        Dados decodificados do token
    
    Raises:
        HTTPException: Se o token for inválido ou expirado
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        # Verifica se o token não expirou
        exp = payload.get("exp")
        if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expirado"
            )
        
        return payload
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {str(e)}"
        )


def authenticate_admin(username: str, password: str) -> bool:
    """
    Autentica um usuário admin.
    Em produção, buscar do banco de dados.
    
    Args:
        username: Nome de usuário
        password: Senha em texto plano
    
    Returns:
        True se autenticado, False caso contrário
    """
    # Em produção, buscar hash da senha do banco
    # Por enquanto, comparação simples
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        return True
    return False


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency para proteger rotas com JWT.
    Extrai e valida o token do header Authorization.
    
    Usage:
        @router.get("/protected")
        def protected_route(user: dict = Depends(get_current_user)):
            return {"user": user}
    
    Args:
        credentials: Credenciais Bearer extraídas do header
    
    Returns:
        Dados do usuário decodificados do token
    
    Raises:
        HTTPException: Se o token for inválido
    """
    token = credentials.credentials
    payload = verify_token(token)
    
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: usuário não encontrado"
        )
    
    return {
        "username": username,
        "exp": payload.get("exp"),
        "iat": payload.get("iat")
    }


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """
    Dependency para rotas que exigem privilégios de admin.
    
    Usage:
        @router.get("/admin/stats")
        def admin_stats(user: dict = Depends(require_admin)):
            return {"stats": "..."}
    
    Args:
        user: Usuário atual (obtido via get_current_user)
    
    Returns:
        Dados do usuário se for admin
    
    Raises:
        HTTPException: Se o usuário não tiver privilégios de admin
    """
    # Verifica se é admin
    if user.get("username") != ADMIN_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: privilégios de administrador necessários"
        )
    
    return user
