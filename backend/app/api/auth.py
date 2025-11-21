import os
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from supabase import create_client, Client
from dotenv import load_dotenv
from app.core.security import encrypt_token 

load_dotenv()  # Carrega variáveis do .env

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1' # PERMITE HTTP EM LOCALHOST (REMOVER EM PRODUÇÃO!)
# CLIENT_SECRETS_FILE = "client_secret.json"
SCOPES = ['https://www.googleapis.com/auth/calendar']
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI") 

# Google config via .env
google_config = {
    "web": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "redirect_uris": [REDIRECT_URI],

        # Estes são padrão do Google (HARDCODED)
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
    }
}

# Config Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

router = APIRouter()

@router.get("/auth/login")
def login_google(clinic_id: str):
    """
    Passo 1: O Frontend chama isso.
    Nós geramos a URL do Google e mandamos o usuário para lá.
    Passamos o 'clinic_id' no parâmetro 'state' para não perdê-lo.
    """
    flow = Flow.from_client_config(
        client_config=google_config,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    
    # 'state' é uma forma de passar dados para o callback. 
    # Estamos passando o ID da clínica para saber quem está logando.
    authorization_url, state = flow.authorization_url(
        access_type='offline', # Importante para receber o Refresh Token
        include_granted_scopes='true',
        state=clinic_id,
        prompt='consent' # Força o Google a pedir consentimento toda vez (para garantir o Refresh Token)
    )
    
    return RedirectResponse(authorization_url)

@router.get("/auth/callback")
def callback_google(request: Request):
    """
    Passo 2: O Google devolve o usuário para cá com um 'code' e o 'state'.
    """
    code = request.query_params.get('code')
    clinic_id = request.query_params.get('state') # Recuperamos o ID da clínica aqui

    if not code or not clinic_id:
        raise HTTPException(status_code=400, detail="Faltando código ou ID da clínica")

    try:
        # Configurar o fluxo novamente
        flow = Flow.from_client_config(
            client_config=google_config,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
        
        # Trocar o 'code' pelos tokens reais
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Aqui está o ouro: O Refresh Token
        refresh_token = credentials.refresh_token

        if not refresh_token:
            return {"erro": "Não recebemos o refresh token. Tente revogar o acesso e logar de novo."}

        # Armazenar o refresh_token no Supabase
        encrypted_refresh_token = encrypt_token(refresh_token)
        
        data, count = supabase.table('clinicas').update({
            'gcal_refresh_token': encrypted_refresh_token 
        }).eq('id', clinic_id).execute()

        # Redirecionar de volta para o Frontend (Dashboard)
        return RedirectResponse("http://localhost:3000/")

    except Exception as e:
        return {"erro": str(e)}     