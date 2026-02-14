import os
import requests
import base64
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

UAZAPI_URL = os.getenv("UAZAPI_URL")

class ImageService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def analisar_imagem_uazapi(self, token, message_id):
        """
        Baixa a imagem da Uazapi e analisa com OpenAI Vision para verificar se é relacionada a clínicas/saúde.
        """
        try:
            print(f"📷 Baixando imagem da mensagem {message_id} via API...")
            
            # Endpoint baseado na documentação
            url = f"{UAZAPI_URL}/message/download"
            
            headers = {
                "Content-Type": "application/json",
                "token": token
            }
            
            body = {
                "id": message_id,
                "return_base64": True,
                "generate_mp3": False
            }
            
            response = requests.post(url, json=body, headers=headers, timeout=15)
            
            if response.status_code != 200:
                print(f"❌ Erro Download Imagem Uazapi ({response.status_code}): {response.text}")
                return None
            
            resp_json = response.json()
            print("✅ Imagem baixada com sucesso.")
            
            # O Base64 pode vir em 'base64Data' ou 'data'
            image_base64 = resp_json.get("base64Data") or resp_json.get("data")
            
            if not image_base64:
                print("❌ Base64 da imagem não encontrado na resposta.")
                return None
            
            # Obter informações sobre a imagem
            mime_type = resp_json.get("mimetype") or resp_json.get("mimeType") or "image/jpeg"
            
            print("📝 Enviando para OpenAI Vision...")
            
            # Analisar a imagem com OpenAI Vision
            response = self.client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """Analise esta imagem e determine se está relacionada ao contexto de clínicas médicas, odontológicas, estéticas ou de saúde em geral.

Se a imagem estiver relacionada ao contexto de saúde/clínicas (exames, resultados, sintomas, dúvidas médicas, procedimentos, etc.), descreva brevemente o que você vê e como posso ajudar o paciente.

Se a imagem NÃO estiver relacionada ao contexto de saúde/clínicas, responda apenas: "IGNORAR"

Seja conciso e profissional."""
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=300
            )
            
            resposta = response.choices[0].message.content.strip()
            print(f"🎯 Análise da imagem: {resposta}")
            
            if resposta == "IGNORAR":
                return None
            
            return resposta
            
        except Exception as e:
            print(f"❌ Erro na análise da imagem: {e}")
            return None