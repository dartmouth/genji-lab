FROM postgres:17.7

RUN apt-get update && \
    apt-get upgrade && \
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
    # Optional: Install MeCab tokenizer for full-text search
    apt-get install -y -V groonga-tokenizer-mecab && \
    # Cleanup
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*