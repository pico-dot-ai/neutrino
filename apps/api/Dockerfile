FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/ai-gateway/package.json packages/ai-gateway/package.json
COPY packages/adapters/package.json packages/adapters/package.json

RUN npm install

COPY . .
RUN npm run build --workspace @neutrino/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 8080

CMD ["node", "apps/api/dist/server.js"]
