from abc import ABC, abstractmethod
import datetime as dt
from typing import List, Dict, Any

class CalendarService(ABC):
    """
    Classe Abstrata (Interface) que define o contrato para
    qualquer provedor de calendário (Google, Outlook, etc).
    """

    @abstractmethod
    def listar_calendarios(self) -> List[Dict[str, str]]:
        """
        Deve retornar uma lista de dicionários com 'id' e 'summary'.
        Usado para o onboarding da recepcionista.
        """
        pass

    @abstractmethod
    def listar_eventos(self, data: dt.datetime, calendar_id: str = 'primary') -> List[Dict[str, Any]]:
        """
        Deve retornar a lista de eventos de um dia específico.
        """
        pass

    @abstractmethod
    def criar_evento(self, calendar_id: str, resumo: str, inicio_dt: dt.datetime, descricao: str, duracao_minutos: int) -> Dict[str, Any]:
        """
        Deve criar um evento e retornar os dados dele (link, id).
        """
        pass
    
    @abstractmethod
    def cancelar_evento(self, calendar_id: str, event_id: str) -> bool:
        """Deleta um evento do calendário."""
        pass

    @abstractmethod
    def mover_evento(self, calendar_id: str, event_id: str, novo_inicio: dt.datetime) -> Dict[str, Any]:
        """Atualiza a data/hora de um evento existente."""
        pass

    @abstractmethod
    def obter_email_usuario(self) -> str:
        """Obtém o email do usuário conectado ao calendário."""
        pass