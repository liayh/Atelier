# Image de compilation Windows avec outils de signature Authenticode.
# Base : image officielle d'electron-builder (Wine pour NSIS) + Java + jsign (signature)
# + osslsigncode (vérification). Construite automatiquement par scripts/build-win.sh.
FROM electronuserland/builder:wine

ARG JSIGN_VERSION=7.6
ARG JSIGN_SHA256=6cf58aa080e7ff82656f320cff8d4a3bff30408df8766806dcba3740dd839fa5

RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-17-jre-headless osslsigncode \
 && rm -rf /var/lib/apt/lists/* \
 && curl -fsSL -o /opt/jsign.jar "https://github.com/ebourg/jsign/releases/download/${JSIGN_VERSION}/jsign-${JSIGN_VERSION}.jar" \
 && echo "${JSIGN_SHA256}  /opt/jsign.jar" | sha256sum -c -
