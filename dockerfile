FROM ghcr.io/puppeteer/puppeteer:22.15.0

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "start"]