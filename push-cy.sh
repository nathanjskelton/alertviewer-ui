#!/bin/bash
X=`node get_version.js`
echo "*** Pushing version $X ***"
docker push containeryard.evoforge.org/gmdev/platform/cortana-ui:$X
