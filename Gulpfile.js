////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var gulp = require('gulp');

var sourcemaps = require('gulp-sourcemaps');
var traceur = require('gulp-traceur');
//var sass = require('gulp-sass');
//var svgmin = require('gulp-svgmin');


////////////////////////////////////////////////////////////////////////////////////
// Tasks
////////////////////////////////////////////////////////////////////////////////////

gulp.task('build-sources', function () {
	return gulp.src('src/javascript/**/*.js')
		.pipe(sourcemaps.init())
		.pipe(traceur())
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('build'));
});

gulp.task('copy-public', function () {
	return gulp.src('public/**/*')
		.pipe(gulp.dest('build/public'));
});

gulp.task('copy-public-html', function () {
	return gulp.src('public/**/*.html')
		.pipe(gulp.dest('build/public'));
});

gulp.task('copy-public-styles', function () {
	return gulp.src('public/styles/**/*.css')
		.pipe(gulp.dest('build/public/styles'));
});

gulp.task('copy-public-scripts', function () {
	return gulp.src('public/scripts/**/*')
		.pipe(gulp.dest('build/public/scripts'));
});

gulp.task('copy-views', function () {
	return gulp.src('views/*')
		.pipe(gulp.dest('build/views'));
});

gulp.task('copy-project-resources', function () {
	return gulp.src('{package.json,README.md}')
		.pipe(gulp.dest('build/'));
});

//gulp.task('copy-public-svg', function() {
//	return gulp.src('public/images/**/*.svg')
//		.pipe(svgmin())
//		.pipe(gulp.dest('build/public/images'));
//});

//gulp.task('build-sass', function () {
//	gulp.src('src/sass/*.scss')
//		.pipe(sourcemaps.init())
//		.pipe(sass())
//		.pipe(sourcemaps.write())
//		.pipe(gulp.dest('build/public/styles'));
//});

//gulp.task('watch-sass', function() {
//	gulp.watch('src/sass/*.scss', ['build-sass']);
//});

gulp.task('watch-views', function() {
	gulp.watch('views/*', ['copy-views']);
});

gulp.task('watch-public-scripts', function() {
	gulp.watch('public/scripts/**/*.js', ['copy-public-scripts']);
});

gulp.task('watch-public-html', function() {
	gulp.watch('public/**/*.html', ['copy-public-html']);
});

gulp.task('watch-public-styles', function() {
	gulp.watch('public/styles/**/*.css', ['copy-public-styles']);
});

//gulp.task('watch-public-svg', function() {
//	gulp.watch('public/images/**/*.svg', ['copy-public-svg']);
//});

gulp.task('watch', [/*'watch-sass', */'watch-views', 'watch-public-scripts']);

// default gulp task
gulp.task('default', ['build-sources', 'copy-public'/*, 'copy-public-svg'*/, 'copy-views', 'copy-project-resources'/*, 'build-sass'*/]);
