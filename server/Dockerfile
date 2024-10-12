FROM python:3.7.11-stretch

# Install dependencies for gt (GenomeTools), bgzip, and tabix
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    zlib1g-dev \
    libbz2-dev \
    liblzma-dev \
    tabix \
    bcftools \
    libhts-dev

# Download and make scripts executable
RUN curl -o datasets 'https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/LATEST/linux-amd64/datasets' \
    chmod +x datasets \
    mv datasets /usr/local/bin

# Install GenomeTools (gt) using curl
RUN curl -L http://genometools.org/pub/genometools-1.6.2.tar.gz -o genometools-1.6.2.tar.gz && \
    tar -xvzf genometools-1.6.2.tar.gz && \
    cd genometools-1.6.2 && \
    make && \
    make install

# Install bgzip (provided by htslib) using curl
RUN curl -L https://github.com/samtools/htslib/releases/download/1.14/htslib-1.14.tar.bz2 -o htslib-1.14.tar.bz2 && \
    tar -xjf htslib-1.14.tar.bz2 && \
    cd htslib-1.14 && \
    ./configure && \
    make && \
    make install

# Copy Python requirements and install Python dependencies
COPY ./requirements.txt /server/requirements.txt
WORKDIR /server

RUN python -m pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy app files
COPY . /server

# Expose API port
EXPOSE ${API_PORT}

# Start the application
CMD ["uwsgi", "app.ini"]
