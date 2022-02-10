#!/bin/bash
source /root/.bash_profile
yarn install && yarn build && cp -a ../build/. /var/www/html