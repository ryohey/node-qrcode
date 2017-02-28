var browserify = require('browserify')
var uglify = require('uglify-js')
var fs = require('fs')

var q = [
  function () {
    if (!fs.existsSync('./build')) {
      fs.mkdirSync('./build')
    }

    done()
  },

  function () {
    browserify('lib/index.js', {
      standalone: 'qrcodelib',
      debug: true
    })
    .bundle(function (err, buf) {
      if (err) {
        console.error('browserify failed!', err.message)
        process.exit(1)
      }
      fs.writeFileSync('build/qrcode.js', buf)
      done()
    })
  },

  function () {
    try {
      var result = uglify.minify(['build/qrcode.js'], {
        outSourceMap: 'qrcode.min.js.map'
      })
      fs.writeFileSync('build/qrcode.min.js', result.code)
      fs.writeFileSync('build/qrcode.min.js.map', result.map)
    } catch (e) {
      console.error('uglify failed!', e.message)
      fs.unlink('build/qrcode.min.js', function () {
        process.exit(1)
      })
    }
  }
]

var done = function () {
  var j = q.shift()
  if (j) j()
  else complete()
}

var complete = function () {
  console.log('build complete =)')
}

done()
