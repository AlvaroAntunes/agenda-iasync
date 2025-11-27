# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm install

# Copiar o resto do código
COPY . .

# Construir o projeto para produção
RUN npm run build

# Expor a porta 3000
EXPOSE 3000

# Rodar em modo produção
CMD ["npm", "start"]
