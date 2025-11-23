import datetime as dt

def formatar_hora(iso_string):
    """Converte string ISO 8601 para formato HH:MM."""
    if not iso_string: return "??"
    
    # Converte de string ISO para objeto datetime
    try:
        data_obj = dt.datetime.fromisoformat(iso_string)
        #  Retorna apenas Hora:Minuto
        return data_obj.strftime('%H:%M')
    except ValueError:
        return iso_string # Retorna a string original se falhar na conversão
    
