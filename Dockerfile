# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS dev

WORKDIR /app

ENV NODE_ENV=development
ENV VITE_PORT=43173

COPY package.json package-lock.json* bun.lockb* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

EXPOSE 43173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
