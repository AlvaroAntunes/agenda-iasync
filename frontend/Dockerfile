# 1. Usar uma imagem Node.js leve
FROM node:18-alpine

# 2. Definir diretório de trabalho
WORKDIR /app

# 3. Copiar ficheiros de dependências
COPY package*.json ./

# 4. Instalar dependências
RUN npm install

# 5. Copiar o resto do código fonte
COPY . .

# --- SEÇÃO CRÍTICA PARA NEXT.JS ---
# Recebe a variável do docker-compose (args)
ARG NEXT_PUBLIC_API_URL
# Define como variável de ambiente para o build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# 6. Construir o projeto (Gera a pasta .next)
# O Next.js vai ler a ENV acima e "cimentar" no código JS
RUN npm run build

# 7. Expor a porta interna (Padrão do Next)
EXPOSE 3000

# 8. Comando para iniciar em produção
CMD ["npm", "start"]