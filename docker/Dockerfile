FROM node:14.17.3

RUN mkdir -p /usr/src/request-network/app
WORKDIR /usr/src/request-network

COPY frontend.js /usr/src/request-network/
COPY package.json /usr/src/request-network/
COPY modules/favicon.*.ico /usr/src/request-network/app/
COPY modules/global.*.css /usr/src/request-network/app/
COPY modules/global.*.map /usr/src/request-network/app/
COPY modules/index.html /usr/src/request-network/app/
COPY modules/src.*.js /usr/src/request-network/app/
COPY modules/src.*.map /usr/src/request-network/app/

RUN npm install

EXPOSE 8080

CMD ["npm", "start"]
