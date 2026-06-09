FROM node:20-alpine AS build

WORKDIR /app
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY *.traineddata ./
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache openssl

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/*.traineddata ./
COPY --chown=node:node package*.json ./
RUN mkdir -p logs && chown node:node logs

USER node

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
