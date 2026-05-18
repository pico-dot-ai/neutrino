FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/schema/package.json packages/schema/package.json
COPY packages/ports/package.json packages/ports/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/ai-gateway/package.json packages/ai-gateway/package.json
COPY packages/platform-gateway/package.json packages/platform-gateway/package.json
COPY packages/identity-gateway/package.json packages/identity-gateway/package.json
COPY packages/adapters/package.json packages/adapters/package.json

RUN npm install

COPY . .
RUN npm run build --workspace @neutrino/api

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 8080

CMD ["node", "apps/api/dist/server.js"]
