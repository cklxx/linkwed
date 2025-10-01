# Multi-stage build to produce an optimized production image
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY public ./public
COPY server ./server
COPY data ./data

ENV PORT=80

EXPOSE 80

CMD ["node", "server/index.mjs"]
