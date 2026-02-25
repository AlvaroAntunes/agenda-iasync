"""
    Módulo de segurança para criptografia e descriptografia de tokens usando Fernet.
"""

import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("ENCRYPTION_KEY")

if not key:
    raise ValueError("ENCRYPTION_KEY não encontrada no .env")

cipher_suite = Fernet(key)

def encrypt_token(raw_token: str) -> str:
    """Recebe o token puro e retorna ele criptografado (string)."""
    if not raw_token:
        return None
    # Fernet espera bytes, então fazemos encode()
    encrypted_bytes = cipher_suite.encrypt(raw_token.encode())
    # O banco espera string, então fazemos decode()
    return encrypted_bytes.decode()

def decrypt_token(encrypted_token: str) -> str:
    """Recebe o token criptografado e retorna o original."""
    if not encrypted_token:
        return None
    # Fernet espera bytes
    decrypted_bytes = cipher_suite.decrypt(encrypted_token.encode())
    return decrypted_bytes.decode()

# --- GLOBAL PASSWORD PROTECTION ---
from fastapi import Header, HTTPException, status

API_GLOBAL_PASSWORD = os.getenv("API_GLOBAL_PASSWORD")

async def verify_global_password(x_api_password: str = Header(None)):
    """
    Dependência Global: Verifica se o cabeçalho 'x-api-password' corresponde à senha definida no .env.
    Se a senha não estiver configurada no .env, permite o acesso (modo inseguro ou dev).
    """
        
    if x_api_password != API_GLOBAL_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Global API Password"
        )