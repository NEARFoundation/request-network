#!/bin/bash

docker run --name=request-network -p 8080:8080 -p 8081:8081 -d request-network:0.1.0
