FROM iojs:1.5-onbuild

RUN apt-get update
RUN apt-get install -y git curl build-essential make --force-yes
RUN apt-get install -y software-properties-common --force-yes
RUN apt-get update
RUN apt-get install -y ruby2.2.1 --force-yes
RUN gem install foreman bundler --no-ri --no-rdoc

RUN gem install sass --no-ri --no-rdoc
RUN npm install
RUN node_modules/bower/bin/bower install --allow-root
RUN node_modules/gulp/bin/gulp.js
EXPOSE 9000