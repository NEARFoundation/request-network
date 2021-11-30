FROM node:14

WORKDIR /near_indexer_data_collector
COPY package.json .
RUN npm install
COPY . .
CMD npm start
