FROM node:20-bookworm-slim

ENV TZ=Asia/Jakarta
RUN apt-get update && apt-get install -y tzdata && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install
COPY . .

RUN npm run build
RUN mkdir -p data tmp backups baileys_auth_info

CMD ["npm", "start"]
