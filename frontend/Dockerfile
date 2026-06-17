FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install
RUN npx prisma generate

COPY . .

EXPOSE 5179

CMD ["npm", "run", "dev", "--", "-p", "5179"]
