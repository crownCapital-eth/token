#!/bin/bash
source /root/.bash_profile
yarn --cwd ../ install && yarn --cwd ../ build && cp -a ../build/. /var/www/html