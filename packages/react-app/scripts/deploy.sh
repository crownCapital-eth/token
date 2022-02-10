#!/bin/bash
source /root/.bash_profile
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
yarn --cwd "$SCRIPT_DIR/.." install && yarn --cwd "$SCRIPT_DIR/.." build && cp -a "$SCRIPT_DIR/../build/." /var/www/html