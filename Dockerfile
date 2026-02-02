FROM node:22-alpine AS base

WORKDIR /app

RUN addgroup -S nodejs -g 1001 \
    && adduser -S nodejs -u 1001 -G nodejs

FROM base AS deps

COPY package*.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force

FROM base AS build

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

RUN addgroup -S nodejs -g 1001 \
    && adduser -S nodejs -u 1001 -G nodejs

ENV NODE_ENV=production \
    NODE_OPTIONS="--no-warnings"

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 8000

CMD ["node", "dist/index.js"]
