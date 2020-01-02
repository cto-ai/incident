############################
# Build container
############################
FROM registry.cto.ai/official_images/node:latest AS dep

WORKDIR /ops

COPY package.json .
RUN npm install

COPY . .
