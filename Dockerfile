FROM iojs:1.5-onbuild
RUN npm install
RUN node_modules/bower/bin/bower install --allow-root
RUN node_modules/gulp/bin/gulp.js
EXPOSE 9000