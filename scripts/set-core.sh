#! /bin/bash

DEFAULT_GATEWAY=""

# $BUILD_ENV is supposed to be set by the runtime
BUILD_DIR="${BUILD_DIR:-build}"

# $API_GATEWAY is supposed to be set by the runtime
core="${API_GATEWAY:-$DEFAULT_GATEWAY}"

echo "setting core: $core in $BUILD_DIR/config.json"
sed -i "s|\"core\": false|\"core\": \"$core\"|" $BUILD_DIR/config.json
