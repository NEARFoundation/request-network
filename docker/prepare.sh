#!/bin/bash

mkdir modules

cp ./.env ../
cd ..
NODE_ENV=testnet yarn build:web
rm .env

cd server
yarn build
cd ..

cp server/dist/server.js docker/modules
cp dist/favicon.*.ico docker/modules
cp dist/global.*.css docker/modules
cp dist/global.*.map docker/modules
cp dist/index.html docker/modules
cp dist/src.*.js docker/modules
cp dist/src.*.map docker/modules

cd docker
