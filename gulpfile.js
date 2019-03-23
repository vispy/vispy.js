var gulp = require('gulp'),
    log = require('fancy-log'),
    jshint = require('gulp-jshint'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    watchify = require('watchify'),
    browserify = require('browserify'),
    sourcemaps = require('gulp-sourcemaps'),
    path = require('path'),
    uglify = require('gulp-uglify'),
    rename = require("gulp-rename"),

    index = './scripts/vispy.js',
    outdir = './dist/',
    bundle = 'vispy',
    outfile = 'vispy.js';

var srcs = [
            './scripts/**/*.js',
            'gulpfile.js'
           ];

function rebundle(file) {
    if (file) {
        log('Rebundling,', path.basename(file[0]), 'has changes.');
    }

    return this.bundle()
        .on('error', log.bind(log, 'Browserify Error'))         // log errors if they happen
        .pipe(source(outfile))
        .pipe(buffer())
        .pipe(gulp.dest(outdir)) //generate the non-minified
        .pipe(rename({extname:'.min.js'}))
        .pipe(sourcemaps.init({loadMaps:true, debug:true}))             // init source map
        .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(outdir));
}

function createBundler(args) {
    args = args || {};
    args.standalone = bundle;
    args.debug = true; //let browserify generate sourcemap. (will be inlined, loaded in sourcemaps, then removed by uglify, and finally generated in .map by sourcemaps)

    return browserify(index, args);
}

/*****
 * Dev task, incrementally rebuilds the output bundle as the the sources change
 *****/
gulp.task('dev', function() {
    watchify.args.standalone = bundle;
    var bundler = watchify(createBundler(watchify.args));

    bundler.on('update', rebundle);

    return rebundle.call(bundler);
});

/*****
 * Build task, builds the output bundle
 *****/
gulp.task('build', function () {
    return rebundle.call(createBundler());
});

/*****
 * JSHint task, lints the lib and test *.js files.
 *****/
gulp.task('jshint', function () {
    return gulp.src(srcs)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-summary'));
});


// gulp.task('compress', ['build'], function() {
//   gulp.src(outdir + outfile)
//     .pipe(gulp.dest(outdir))
// });

/*****
 * Base task
 *****/
gulp.task('default', gulp.series('jshint', 'build'));
