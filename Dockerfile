FROM node:24-slim AS builder
WORKDIR /app
RUN corepack enable pnpm && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json ./apps/client/
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile --filter @wordmongering/client
COPY apps/client ./apps/client
RUN pnpm build

FROM node:24-slim AS runner
WORKDIR /app
RUN corepack enable pnpm && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json ./apps/client/
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile --prod --filter @wordmongering/server
COPY apps/server ./apps/server
COPY --from=builder /app/apps/client/dist ./apps/client/dist
EXPOSE 3000
CMD ["node", "apps/server/index.ts"]
