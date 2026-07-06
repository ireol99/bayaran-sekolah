FROM oven/bun:1 as builder
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install

COPY . .

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app /app

EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
