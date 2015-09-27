#!/usr/bin/env bash

echo 'This will override the file ./dist/jquery-meteor-blaze.devel.js.'
echo 'Are you sure you would like to proceed?';
echo "(Must Type 'yes' to continue.";

read ANS;

if [ $ANS == "yes" ];
then
  echo 'Running..';
  rm ./dist/jquery-meteor-blaze.devel.js
  ./node_modules/browserify/bin/cmd.js ./node_modules/meteor-client/meteor-client.js -o ./dist/jquery-meteor-blaze.devel.js
  echo 'Completed.';
  echo 'Right now this only alters your devel verison.';
  echo 'A minified and gzipped version must be created manually.';
else
  echo 'Aborting';
fi
