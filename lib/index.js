/*
*copyright Ryan Day 2012
*
* Licensed under the MIT license:
*   http://www.opensource.org/licenses/mit-license.php
*
* this is the main server side application file for node-qrcode.
* these exports use serverside canvas api methods for file IO and buffers
*
*/

var QRCodeLib = require('./renderer/qrcode-draw')
var terminalRender = require('./renderer/terminal')
var svgRender = require('./renderer/svg')
var Canvas = require('./renderer/buffer-canvas')
var fs = require('fs')

var QRCodeDraw = QRCodeLib.QRCodeDraw

// EXPORTS

//
// breaking change to 0.1 this used to be an instance. now it returns the constructor.
//
exports.QRCodeDraw = QRCodeDraw

//
// export error correct levels.
//
exports.errorCorrectLevels = QRCodeLib.QRErrorCorrectLevel

//
// export original canvas to be used with draw method, esp. Canvas.Image
//
exports.canvas = Canvas

/*
* provide an api to return the max characters allowed for given dimensions, and miniumum error correction level
* the qr code library will always use the maximum error correction level for the given numbar of chars constrained by size
*/
exports.getMaxChars = function (minErrorCorrectionLevel, width, moduleScale) {
  // TODO THIS NEEDS TO WORK
  console.log('this doesnt work yet. comming soon =)')
}

var parseOptions = function (options) {
  var textKeys = {
    'minimum': QRCodeLib.QRErrorCorrectLevel.L,
    'medium': QRCodeLib.QRErrorCorrectLevel.M,
    'high': QRCodeLib.QRErrorCorrectLevel.Q,
    'max': QRCodeLib.QRErrorCorrectLevel.H
  }

  if (options.errorCorrectLevel) {
    var ec = options.errorCorrectLevel
    if (textKeys[ec]) {
      options.errorCorrectLevel = textKeys[ec]
    }
  }
  return options
}

// returns Canvas Object with qr code drawn on it
/*
* String text, optional Object options, Function callback
*/
var draw = exports.draw = function (text, options, cb) {
  var args = Array.prototype.slice.call(arguments)
  cb = args.pop()
  if (typeof cb !== 'function') {
    throw new TypeError('last argument must be a function')
  }

  text = args.shift()
  options = args.shift() || {}
  options = parseOptions(options)

  // NOTE the width and height are determined from within the qr code lib and are not configurable from the outside yet

  var drawInstance = new QRCodeDraw()
  drawInstance.draw(new Canvas(200, 200), text, options, function (error, canvas, qrWidth) {
    cb(error, canvas, qrWidth)
  })
}

// returns data uri for drawn qrcode png
exports.toDataURL = exports.toDataURI = function (text, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  draw(text, options, function (error, canvas) {
    if (error) {
      cb(error)
    } else {
      canvas.toDataURL(cb)
    }
  })
}

// synchronous PNGStream
exports.toPNGStream = function (text, WSpath, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  var out = fs.createWriteStream(WSpath)

  draw(text, options, function (error, canvas) {
    var stream
    if (error) {
      cb(error, '')
    } else {
      stream = canvas.createPNGStream()
    }

    stream.pipe(out)

    stream.on('end', function () {
      cb(error, '')
    })

    stream.pipe(out)
  })

  return out
}

// returns bytes written to file
exports.save = function (path, text, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  var fileExt = path.slice((path.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase()

  if (fileExt === 'svg') {
    saveSvg(path, text, options, cb)
  } else {
    savePng(path, text, options, cb)
  }
}

function savePng (path, text, options, cb) {
  draw(text, options, function (error, canvas) {
    if (error) {
      throw new Error(error)
    }

    var fd
    var buf
    var fdAndBuf = function () {
      fs.write(fd, buf, 0, buf.length, 0, function (fsErr, written) {
        fs.close(fd)
        if (cb) cb(fsErr, written)
      })
    }

    // run non dependent async calls at the same time ish
    canvas.toBuffer(function (canvasErr, _buf) {
      if (canvasErr) return cb(canvasErr)
      buf = _buf
      if (fd) fdAndBuf()
    })

    fs.open(path, 'w', function (fsErr, _fd) {
      if (fsErr) return cb(fsErr)
      fd = _fd
      if (buf) fdAndBuf()
    })
  })
}

function saveSvg (path, text, options, cb) {
  exports.drawSvg(text, function (error, code) {
    if (!error) {
      fs.writeFile(path, code, function (fsErr) {
        return cb(fsErr, fsErr ? null : code)
      })
    }
  })
}

//
// this returns an array of points that have either a 0 or 1 value representing 0 for light and 1 for dark
// these values include points in the white edge of the qrcode because that edge is actually part of the spec
//
exports.drawBitArray = function (text, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  options = parseOptions(options)

  var drawInstance = new QRCodeDraw()
  drawInstance.drawBitArray(text, options, function (error, bits, width) {
    cb(error, bits, width)
  })
}

//
// draw qr in your terminal!
//
exports.drawText = function (text, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  var drawInstance = new QRCodeDraw()
  drawInstance.drawBitArray(text, function (error, bits, width) {
    if (!error) {
      var code = terminalRender.renderBits(bits, width)
      cb(error, code)
    } else {
      cb(error, null)
    }
  })
}

exports.drawSvg = function (text, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  var drawInstance = new QRCodeDraw()
  drawInstance.drawBitArray(text, function (error, bits, width) {
    if (!error) {
      var code = svgRender.renderBits(bits, width, options)
      cb(error, code)
    } else {
      cb(error, null)
    }
  })
}
