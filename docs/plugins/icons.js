var fs = require('fs')
  , path = require('path')

var icons = function(opts) {

  // commonly set default options here
  var iconsFile = opts.index || 'index.json'

  // return the function to be given to the `.use` call.
  return function(files, metalsmith, done) {
    var meta = metalsmith.metadata()

    meta.icons = JSON.parse(fs.readFileSync(iconsFile))
      .map((file) => {
        return {
          path: file,
          name: path.basename(file, '.svg'),
          category: path.dirname(file)
        }
      })

    done()
  }
}

module.exports = icons;
