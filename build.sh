#!/bin/bash
X=`node get_version.js`

echo "*** Building version $X ***"
npm run build
docker build -t containeryard.evoforge.org/gmdev/platform/cortana-ui:$X .
