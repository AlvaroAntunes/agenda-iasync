# ESTÁGIO 1: Builder
# Mudei para node:20-alpine para garantir compatibilidade com Next.js novo
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# MUDANÇA AQUI: Adicionei --legacy-peer-deps para ignorar o erro do next-intl
# npm ci é mais rápido e confiável para builds (requer package-lock.json)
RUN npm ci --legacy-peer-deps

# Copia o resto do código
COPY . .

# --- SEÇÃO CRÍTICA PARA NEXT.JS ---
# Recebe a variável do docker-compose (args) durante a fase de build
ARG NEXT_PUBLIC_API_URL
# Define como variável de ambiente para que o Next.js possa "cimentar" no código
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Desativa telemetria durante o build para ser mais rápido
ENV NEXT_TELEMETRY_DISABLED 1

# Gera a build de produção (incluindo a pasta .next/standalone)
RUN npm run build

# ESTÁGIO 2: Produção
# Imagem limpa e leve para rodar o servidor
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copiar package.json (caso algum script precise)
COPY --from=builder /app/package*.json ./

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos buildados do estágio 'builder'
# Apenas o necessário para rodar (Standalone mode)
COPY --from=builder /app/public ./public

# Configura permissões corretas para o cache do Next.js
# (Opcional, mas boa prática se usar cache de imagem)
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copia o output standalone (O servidor otimizado)
# Certifique-se de ter 'output: "standalone"' no next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Muda para o usuário seguro
USER nextjs

EXPOSE 3000

# O comando muda de 'npm start' para rodar o servidor standalone diretamente com node
CMD ["node", "server.js"]