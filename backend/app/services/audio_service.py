import os
import requests
import tempfile
from openai import OpenAI
from dotenv import load_dotenv
import base64

load_dotenv()

UAZAPI_URL = os.getenv("UAZAPI_URL")

class AudioService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def transcrever_audio_uazapi(self, token, message_id):
        """
        Usa o endpoint /message/download da Uazapi para baixar o áudio descriptografado.
        """
        temp_filename = None
        
        try:
            print(f"📥 Baixando áudio da mensagem {message_id} via API...")
            
            # Endpoint baseado na documentação
            url = f"{UAZAPI_URL}/message/download"
            
            headers = {
                "Content-Type": "application/json",
                "token": token
            }
            
            body = {
                "id": message_id,
                "return_base64": True,  # Pedimos o arquivo físico
                "generate_mp3": False   # False = Retorna OGG (nativo do Whats), True = MP3
            }
            
            response = requests.post(url, json=body, headers=headers, timeout=15)
            
            if response.status_code != 200:
                print(f"❌ Erro Download Uazapi ({response.status_code}): {response.text}")
                return None
            
            resp_json = response.json()
            print("✅ Áudio baixado com sucesso.")
            # print(resp_json)
            
            # O Base64 pode vir em 'base64Data' ou 'data'
            audio_base64 = resp_json.get("base64Data") or resp_json.get("data")
            
            if not audio_base64:
                print("❌ Nenhum Base64 retornado pela API.")
                return None
            
            # Limpa cabeçalho se existir (data:audio/ogg;base64,...)
            if "," in audio_base64:
                audio_base64 = audio_base64.split(",")[1]

            # Decodifica
            audio_bytes = base64.b64decode(audio_base64)
            
            # Salva temporário
            with tempfile.NamedTemporaryFile(delete=False, suffix=".ogg") as temp_file:
                temp_file.write(audio_bytes)
                temp_filename = temp_file.name

            # Transcreve
            print("📝 Enviando para OpenAI Whisper...")
            with open(temp_filename, "rb") as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file,
                    language="pt"
                )
            
            return transcript.text

        except Exception as e:
            print(f"❌ Erro na transcrição: {e}")
            return None
            
        finally:
            if temp_filename and os.path.exists(temp_filename):
                try: os.remove(temp_filename)
                except: pass