#!/bin/bash
source /root/.bash_profile
scriptdir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
yarn --cwd "${scriptdir}/.." install && yarn --cwd "${scriptdir}/.." build && cp -a "${scriptdir}/../build/." /var/www/html