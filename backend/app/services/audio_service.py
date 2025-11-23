import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()  # Carrega variáveis do .env

class AudioService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def transcrever_audio(self, caminho_arquivo_audio):
        """
        Recebe o caminho de um arquivo de áudio (ogg, mp3, wav)
        e retorna o texto transcrito usando Whisper-1.
        """
        try:
            with open(caminho_arquivo_audio, "rb") as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file,
                    language="pt" # Força português para melhorar precisão
                )
            return transcript.text
        except Exception as e:
            print(f"Erro na transcrição: {e}")
            return None