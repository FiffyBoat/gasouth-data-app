FROM node:20-alpine

RUN apk add --no-cache vips-dev build-base python3

WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm install --production

COPY server/src ./src
COPY server/migrations ./migrations

RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["node", "src/index.js"]
