FROM oven/bun:1.3 AS build
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
RUN cd apps/api && bunx prisma generate
RUN cd apps/web && bun run build

FROM oven/bun:1.3
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["sh", "-c", "bunx prisma migrate deploy && bun src/index.ts"]
