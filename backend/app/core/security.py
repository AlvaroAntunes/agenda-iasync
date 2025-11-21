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