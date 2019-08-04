#!/bin/bash

# allowed versions
declare -a versions
versions=(patch minor major)

if [ "$1" ] && [ "$2" ]; then
  # create .git directory
  mkdir -p projects/ngrx-store-storagesync/.git

  if [[ ! "${versions[@]}" =~ "$1" ]]; then
    echo "$1 is not valid. Try one of the following: ${versions[*]}"
    exit 1
  fi

  #update projects/ngrx-store-storagesync/package.json
  npm version $1 --prefix projects/ngrx-store-storagesync -m $2
else
  echo "provide version type and a commit message as argument! e.g.: ./version.sh patch \"my commit message\" "
  exit 1
fi