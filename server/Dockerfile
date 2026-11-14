# Servidor comunitário do Casulo: sem dependências, só Node.
FROM node:22-alpine
WORKDIR /app
COPY index.mjs core.mjs moderation.mjs validation.mjs privacy.mjs webcrypto.mjs backup.mjs push.mjs mod.html blocklist.txt ./
ENV PORT=8787 DB_PATH=/data/community.db NODE_ENV=production
EXPOSE 8787
CMD ["node", "index.mjs"]
