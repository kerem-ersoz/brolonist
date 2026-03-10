# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

RUN npm ci

COPY . .

# Build shared first, then server and client
RUN npm run build -w packages/shared
RUN npm run build -w packages/server
RUN npm run build -w packages/client

# Production stage — server only (client is static)
FROM node:20-alpine AS server
WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/prisma ./packages/server/prisma

RUN npm ci --omit=dev --workspace=packages/server --workspace=packages/shared
RUN npx -w packages/server prisma generate

EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "packages/server/dist/index.js"]
