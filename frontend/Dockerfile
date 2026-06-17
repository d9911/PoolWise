FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 5179

CMD ["npm", "run", "dev", "--", "-p", "5179"]
