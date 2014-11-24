////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var gulp = require('gulp');

var sourcemaps = require('gulp-sourcemaps');
var traceur = require('gulp-traceur');
var sass = require('gulp-sass');

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

gulp.task('copy-views', function () {
	return gulp.src('views/*')
		.pipe(gulp.dest('build/views'));
});

gulp.task('copy-project-resources', function () {
	return gulp.src('{package.json,README.md}')
		.pipe(gulp.dest('build/'));
});

gulp.task('sass', function () {
	gulp.src('./src/sass/*.scss')
		.pipe(sourcemaps.init())
		.pipe(sass())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('build/public/styles'));
});

// default gulp task
gulp.task('default', ['build-sources', 'copy-public', 'copy-views', 'copy-project-resources', 'sass']);
