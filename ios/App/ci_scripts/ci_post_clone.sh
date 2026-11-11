#!/bin/sh
set -e
cd "$CI_PRIMARY_REPOSITORY_PATH"
brew install node
npm install
npm run build
npx cap sync ios
