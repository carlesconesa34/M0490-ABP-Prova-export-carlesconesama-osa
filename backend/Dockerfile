FROM node:24

WORKDIR /usr/src/app

# Copy package json and npm install, to allow layer cache
COPY package*.json .
RUN npm install

COPY . .

# 5000: HTTP (redirects to HTTPS), 5443: HTTPS
# Expose works only as doc, no real effect. Publish is -p when running
EXPOSE 5000 5443

# CMD [ "npm", "start" ]
# CMD [ "npm", "run", "dev" ]

