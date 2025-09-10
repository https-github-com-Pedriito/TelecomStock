FROM node:18-bullseye-slim

WORKDIR /usr/src/app

COPY package*.json ./

# Installation des dépendances Node.js
RUN npm uninstall bcrypt
RUN npm install bcryptjs

COPY . .

# Create directory for certificates
RUN mkdir -p /usr/src/app/certs

# Expose HTTPS port
EXPOSE 3443

CMD ["npm", "run", "dev"]
