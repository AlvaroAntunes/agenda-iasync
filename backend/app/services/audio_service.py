import os
import requests
import tempfile
import base64
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class AudioService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.evolution_url = os.getenv("EVOLUTION_API_URL")
        self.evolution_key = os.getenv("AUTHENTICATION_API_KEY")

    def transcrever_audio_evolution(self, clinic_id: str, message_object: dict):
        """
        Pede para a Evolution o Base64 do áudio, salva em arquivo e transcreve.
        Compatível com Evolution API v2.3.x
        """
        temp_filename = None
        
        try:
            print(f"🎤 Solicitando Base64 para a Evolution (Clínica: {clinic_id})...")
            
            # Endpoint para descriptografar mídia
            url = f"{self.evolution_url}/chat/getBase64FromMediaMessage/{clinic_id}"
            
            # Payload ajustado para v2
            payload = {
                "instance": clinic_id, # Boa prática na v2
                "message": message_object, # O objeto 'data' completo do webhook
                "convertToMp4": False,
                "forceDownload": True
            }
            
            headers = {
                "apikey": self.evolution_key,
                "Content-Type": "application/json"
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code not in [200, 201]:
                print(f"❌ Erro na Evolution ({response.status_code}): {response.text}")
                return None

            data = response.json()
            base64_audio = data.get("base64")
            
            if not base64_audio:
                print("❌ Evolution não retornou o base64 do áudio.")
                return None

            # 2. Decodificar e Salvar em arquivo temporário (.ogg)
            audio_bytes = base64.b64decode(base64_audio)
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".ogg") as temp_file:
                temp_file.write(audio_bytes)
                temp_filename = temp_file.name

            # 3. Enviar para o Whisper (OpenAI)
            print("📝 Enviando arquivo para OpenAI Whisper...")
            
            with open(temp_filename, "rb") as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file,
                    language="pt" # Força português
                )
            
            texto_transcrito = transcript.text
            print(f"🗣️ Transcrição: {texto_transcrito}")
            
            return texto_transcrito

        except Exception as e:
            print(f"❌ Erro na transcrição de áudio: {e}")
            return None # Retorna None para o webhook avisar o usuário
            
        finally:
            # 4. Limpeza do arquivo temporário
            if temp_filename and os.path.exists(temp_filename):
                try:
                    os.remove(temp_filename)
                except:
                    pass