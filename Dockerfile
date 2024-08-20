FROM ghcr.io/puppeteer/puppeteer:22.15.0

# without this... can't run on linux
USER root
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "start"]