FROM python:3.7.11-stretch

# Update package repositories to use buster release
RUN sed -i 's/stretch/buster/g' /etc/apt/sources.list

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

# Download and make NCBI datasets executable
RUN curl -o datasets 'https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/datasets' && \
    chmod +x datasets && \
    mv datasets /usr/local/bin

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
EXPOSE 80

# Start the application
CMD ["uwsgi", "app.ini"]
