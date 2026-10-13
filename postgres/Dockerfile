# ---------------------------------------------------------------------------
# Stage 1: Rebuild gosu from source with a patched Go toolchain.
#
# The postgres base image ships /usr/local/bin/gosu built against a Go stdlib
# affected by CVE-2025-68121. Trivy flags that vulnerable stdlib version.
# Downloading the upstream release binary would not help because it is compiled
# with the same (vulnerable) toolchain, so we compile gosu ourselves using a
# patched Go release (>= 1.25.7) and copy the result over the base image's copy.
# ---------------------------------------------------------------------------
FROM golang:1.25.7-bookworm AS gosu-build

# Match the upstream gosu release used by the postgres base image.
ARG GOSU_VERSION=1.19

ENV CGO_ENABLED=0 \
    GOTOOLCHAIN=local

RUN set -eux; \
    git clone --depth 1 --branch "$GOSU_VERSION" https://github.com/tianon/gosu.git /src; \
    cd /src; \
    go build -trimpath -ldflags '-s -w' -o /gosu .; \
    /gosu --version; \
    /gosu nobody true

# ---------------------------------------------------------------------------
# Stage 2: PostgreSQL + PGroonga image.
# ---------------------------------------------------------------------------
FROM postgres:17.7

# Keep apt/debconf fully non-interactive during the build so it does not try
# (and fail) to open Dialog/Readline/Teletype frontends, which produced harmless
# but noisy "unable to initialize frontend" warnings. ARG (not ENV) keeps this
# build-only so it does not alter interactive apt behavior in the runtime image.
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    lsb-release \
    wget \
    gnupg && \
    # Install groonga-apt-source package
    wget https://packages.groonga.org/debian/groonga-apt-source-latest-$(lsb_release --codename --short).deb && \
    apt install -y -V ./groonga-apt-source-latest-$(lsb_release --codename --short).deb && \
    rm groonga-apt-source-latest-$(lsb_release --codename --short).deb && \
    # Add PostgreSQL APT repository
    wget -O /usr/share/keyrings/pgdg.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc && \
    echo "deb [signed-by=/usr/share/keyrings/pgdg.asc] http://apt.postgresql.org/pub/repos/apt $(lsb_release --codename --short)-pgdg main" > \
    /etc/apt/sources.list.d/pgdg.list && \
    # Install PGroonga for PostgreSQL 17
    apt-get update && \
    apt-get install -y -V postgresql-17-pgdg-pgroonga && \
    apt-get install -y -V groonga-tokenizer-mecab && \
    # Cleanup
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Replace the base image's vulnerable gosu with the patched build from stage 1.
COPY --from=gosu-build /gosu /usr/local/bin/gosu
RUN set -eux; \
    chmod +x /usr/local/bin/gosu; \
    gosu --version; \
    gosu nobody true
