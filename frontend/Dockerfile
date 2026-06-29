FROM node:22-alpine AS base

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn prisma generate

EXPOSE 5179

CMD ["yarn", "dev", "-p", "5179"]
