FROM iojs:1.5
MAINTAINER Alexis Kinsella <akinsella@helyx.org>

RUN apt-get update
RUN apt-get install -y git curl build-essential make --force-yes
RUN apt-get install -y software-properties-common --force-yes
RUN apt-get install -y ruby-full rubygems-integration --force-yes
RUN gem install sass --no-ri --no-rdoc
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install
RUN mkdir /usr/src/app/public
COPY .bowerrc /usr/src/app/
COPY bower.json /usr/src/app/
RUN node_modules/bower/bin/bower install --allow-root
COPY Gulpfile.js /usr/src/app/
COPY views /usr/src/app/views
COPY public /usr/src/app/public
COPY src /usr/src/app/src
RUN node_modules/gulp/bin/gulp.js

EXPOSE 9000

WORKDIR /usr/src/app/build

CMD ["node", "app.js"]