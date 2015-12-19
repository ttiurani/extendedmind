#!/bin/bash

# check required environment variables are there
: ${ANDROID_HOME:?"Need to set ANDROID_HOME non-empty"}

if [ -d "src/platforms/android" ]
then
  echo "Android already prepared, skipping."
else
  # Work in the src directory
  cd src

  # Create needed empty directories
  mkdir -p platforms
  mkdir -p plugins

  # add android platform
  ./node/node ./node_modules/.bin/cordova platform add android
fi
