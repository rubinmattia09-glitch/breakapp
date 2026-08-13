# Immagine universale per BREAKAPP (server Node + build statica).
FROM node:22-alpine

WORKDIR /app

# Installa le dipendenze (usa package-lock.json per riproducibilità).
COPY package.json package-lock.json ./
RUN npm ci

# Copia il resto del progetto e costruisce la build statica.
COPY . .

# Ignora eventuali .env locali: le credenziali vanno messe come variabili d'ambiente
# nella dashboard dell'hosting (mai committate nel repo).
RUN npm run build

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
