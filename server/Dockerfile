FROM python:3.7.11-stretch

COPY ./requirements.txt /server/requirements.txt

WORKDIR /server

RUN python -m pip install --upgrade pip

RUN pip install -r requirements.txt

COPY . /server

EXPOSE ${API_PORT}

CMD ["uwsgi", "app.ini"]





