/*global require*/
"use strict";

var gulp = require('gulp')
  , csscomb = require('gulp-csscomb')
  , cssmin = require('gulp-cssmin')
  , debug = require('gulp-debug')
  , livereload = require('gulp-livereload')
  , postcss = require('gulp-postcss')
  , rename = require('gulp-rename')
  , rev = require('gulp-rev')
  , sass = require('gulp-sass')
  , sourcemaps = require('gulp-sourcemaps')
  , toJson = require('gulp-to-json')
  , autoprefixer = require('autoprefixer')
  , mq4HoverShim = require('mq4-hover-shim')
  , metalsmith = require('metalsmith')
  , assets = require('metalsmith-assets')
  , icons = require('./docs/plugins/icons')
  , metaobject = require('metalsmith-metaobject')
  , markdown = require('metalsmith-markdown')
  , layouts = require('metalsmith-layouts')
  , express = require('express')
  , connectLivereload = require('connect-livereload')
  , errorhandler = require('errorhandler')
  , serveStatic = require('serve-static')
  , serveIndex = require('serve-index')
  , fs = require('fs')


var autoprefixerOpts = {
  browsers: [
    //
    // Official browser support policy:
    // http://v4-alpha.getbootstrap.com/getting-started/browsers-devices/#supported-browsers
    //
    'Chrome >= 35', // Exact version number here is kinda arbitrary
    // Rather than using Autoprefixer's native "Firefox ESR" version specifier string,
    // we deliberately hardcode the number. This is to avoid unwittingly severely breaking the previous ESR in the event that:
    // (a) we happen to ship a new Bootstrap release soon after the release of a new ESR,
    //     such that folks haven't yet had a reasonable amount of time to upgrade; and
    // (b) the new ESR has unprefixed CSS properties/values whose absence would severely break webpages
    //     (e.g. `box-sizing`, as opposed to `background: linear-gradient(...)`).
    //     Since they've been unprefixed, Autoprefixer will stop prefixing them,
    //     thus causing them to not work in the previous ESR (where the prefixes were required).
    'Firefox >= 31', // Current Firefox Extended Support Release (ESR)
    // Note: Edge versions in Autoprefixer & Can I Use refer to the EdgeHTML rendering engine version,
    // NOT the Edge app version shown in Edge's "About" screen.
    // For example, at the time of writing, Edge 20 on an up-to-date system uses EdgeHTML 12.
    // See also https://github.com/Fyrd/caniuse/issues/1928
    'Edge >= 12',
    'Explorer >= 9',
    // Out of leniency, we prefix these 1 version further back than the official policy.
    'iOS >= 8',
    'Safari >= 8',
    // The following remain NOT officially supported, but we're lenient and include their prefixes to avoid severely breaking in them.
    'Android 2.3',
    'Android >= 4',
    'Opera >= 12'
  ]
}

var postcssProcessors = [
  mq4HoverShim.postprocessorFor({ hoverSelectorPrefix: '.bs-true-hover ' })
, autoprefixer(autoprefixerOpts)
]

var packageJson = JSON.parse(fs.readFileSync('./package.json'))
  , destPath = 'dist/v' + packageJson.version
  , cssDestPath = 'dist/v' + packageJson.version + '/styles'
  , iconDestPath = 'dist/v' + packageJson.version + '/icons'

// Styles task
gulp.task('styles', function () {
  gulp
    .src(['styles/**/*.scss', '!styles/**/_*.scss'], { base: '.' })
    .pipe(debug({title: 'input:'}))
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(sourcemaps.write())
    .pipe(postcss(postcssProcessors))
    //.pipe(csscomb('bower_components/bootstrap/scss/.csscomb.json'))
    .pipe(rename({dirname: './'}))
    .pipe(gulp.dest(cssDestPath))
    .pipe(debug({title: 'css:'}))
    .pipe(cssmin())
    .pipe(rename({suffix: '.min', dirname: './'}))
    .pipe(gulp.dest(cssDestPath))
    .pipe(debug({title: 'min:'}))
    .pipe(livereload())
})

// Icons task
gulp.task('icons', function () {
  var iconBasePath = 'icons'
    , iconPackJson = JSON.parse(fs.readFileSync('./icons/icon-pack.json'))
    , globs = iconPackJson.icons.map((path) =>  iconBasePath + '/' + path)

  var stream = gulp
    .src(globs, { base: iconBasePath })
    .pipe(toJson({
      filename: iconDestPath + '/index.json',
      relative: true
    }))
    .pipe(gulp.dest(iconDestPath))

  return stream; // return the stream as completion hint -- see https://github.com/gulpjs/gulp/blob/master/docs/recipes/running-tasks-in-series.md
})

// Watch task
gulp.task('default', ['styles', 'icons', 'docs', 'serve'], function() {
  gulp.watch('styles/**/*.scss', ['styles'])
  gulp.watch('docs/**/*', ['docs'])
  gulp.watch('icons/**/*', ['icons'])
})


// Docs task
gulp.task('docs', ['styles', 'icons'], function(done) {
  new metalsmith('docs')
    .clean(true)
    .frontmatter(true)
    .use(markdown())
    .use(metaobject({ pkg: packageJson }))
    .use(icons({ index: iconDestPath + '/index.json' }))
    .use(layouts({engine: 'handlebars', default: 'default.hbs', partials: 'partials'}))
    .use(assets())
    .destination('../dist/docs')
    .build(function (err, file) {
      if (err) {
        console.log(err)
      }

      livereload.changed('docs')
      done()
    })
})


// Serve task
gulp.task('serve', function() {
  //Set up your livereload server
  livereload.listen(35729)

  var server = express()
  //Add livereload middleware before static-middleware
  server.use(connectLivereload({port: 35729}))
  server.use(serveStatic(__dirname + '/dist'))
  server.use(serveIndex(__dirname + '/dist'))
  server.use(errorhandler())

  // Set up your static fileserver, which serves files in the build dir
  server.listen(3333)
})

