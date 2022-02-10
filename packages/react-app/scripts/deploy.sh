#!/bin/bash
/root/.nvm/versions/node/v16.14.0/bin/yarn install && /root/.nvm/versions/node/v16.14.0/bin/yarn build && cp -a ../build/. /var/www/html