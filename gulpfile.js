// Setup configuration
var config = {
  inputDir:        './',
  inputFile:       'jquery-meteor-blaze.js',
  outputDir:       './dist/',
  outputFile:      'jquery-meteor-blaze.devel.js',
  outputFileMin:   'jquery-meteor-blaze.min.js',
  outputFileMinGz: 'jquery-meteor-blaze.min.js.gz',
};

// Include dependencies
var gulp       = require('gulp');
var gulpCopy   = require('gulp-copy');
var source     = require('vinyl-source-stream');
var streamify  = require('gulp-streamify')
var browserify = require('browserify');
var rimraf     = require('rimraf');
var rename     = require('gulp-rename');
var jsmin      = require('gulp-jsmin');
var gzip       = require('gulp-gzip');

// Remove files in output directory
gulp.task('clean', function(callback){
  rimraf(
    config.outputDir,
    callback
  );
});

// Produce outfile, min, and gzip versions
function bundle() {
  return browserify( config.inputDir + config.inputFile ).bundle()
    .pipe(
      source( config.outputFile )
    )
    .pipe(
      rename( config.outputFile )
    )
    .pipe(
      gulp.dest( config.outputDir ) // Create the .devel.js
    )
    .pipe(
      streamify( jsmin() )
    )
    .pipe(
      rename( config.outputFileMin )
    )
    .pipe(
      gulp.dest( config.outputDir ) // Create the .min.js
    )
    .pipe(
      streamify( gzip() )
    )
    .pipe(
      rename( config.outputFileMinGz )
    )
    .pipe(
      gulp.dest( config.outputDir ) // Create the .min.gz
    );
}

function copySrc() {
  gulp.src( [ config.inputDir + config.inputFile ] )
  .pipe(
    gulpCopy( config.outputDir, {prefix: 1}) // Copy the source file over
  );
}

// Runs clean then bundles
gulp.task('build-persistent', ['clean'], function() {
  copySrc();
  return bundle();
});

// Runs build-persistent then finishes
gulp.task('build', ['build-persistent'], function() {
  process.exit(0);
});

gulp.task('default', ['build'], function() {
  process.exit(0);
});
