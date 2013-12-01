var oiio = require('./build/Release/nodeoiio');
var Pixel = require("./pixel");
var is = require('is');
var extend = require('node.extend');

var slice = function(arr) {
  return Array.prototype.slice.call(arr);
};

/*
 * new Image(filename)
 * new Image(otherImage)
 * new Image(data, width, height, channels)
 * new Image(width, height, channels)
 */
function Image(varargs) {
  var img = {};
  var args = slice(arguments);
  if(args.length == 1 && is.string(args[0])) {
    img = oiio.read(args[0]);
    img.path = args[0];
  } else if(args.length == 1 && is.instance(args[0], Image)) {
    img = extend({}, args[0]);
  } else if(args.length == 4) {
    if(is.array(args[0])) {
      img.data = new Buffer(args[0]);
    } else if(Buffer.isBuffer(args[0])) {
      img.data = args[0];
    } else {
      throw new TypeError("First argument must be buffer");
    }
    img.width = args[1];
    img.height = args[2];
    img.channels = args[3];
    img.channelnames = img.channels == 3 ? "RGB" 
                     : img.channels == 4 ? "RGBA" 
                     : Array(img.channels.length+1).join('C');
    img.path = null;
  } else if(args.length == 3) {
    img.width = args[0];
    img.height = args[1];
    img.channels = args[2];
    img.channelnames = img.channels == 3 ? "RGB" 
                     : img.channels == 4 ? "RGBA" 
                     : Array(img.channels.length+1).join('C');
    img.data = new Buffer(img.width * img.height * img.channels);
    img.path = null;
  } else {
    throw new Error("Invalid arguments");
  }
  if(typeof img == 'undefined') {
    throw new Error("Unable to open " + img.path + " with OpenImageIO");
  }
  /* Add anything returned in read to here explicitly */
  this.data = img.data;
  this.width = img.width;
  this.height = img.height;
  this.path = img.path;
  this.channels = img.channels;
  this.channelnames = img.channelnames;

  this.write = function(filename) {
    if(arguments.length === 0 && this.path !== null) {
      filename = this.path;
    }
    oiio.write(filename, this.data, this.width, this.height, this.channels);
  };

  /* If this were ECMAScript 6 we'd be able to use a Proxy here.
   * It would still be nice to use it if --harmony is used in node.
   * For now, we'll do it with explicit "get/set" functions and
   * perhaps fix it to use a Proxy once that's standardized. Soon!
   */
  this.getPixel = function(x, y) {
    if(x < 0 || x >= this.width) throw new Error("X out of bounds: " + x);
    if(y < 0 || y >= this.height) throw new Error("Y out of bounds: " + y);
    return new Pixel(this.data.slice((y * this.width + x) * this.channels,
                                      (y * this.width + x) * this.channels + this.channels));
  };

  this.setPixel = function(x, y, pixel) {
    if(x < 0 || x >= this.width) throw new Error("X out of bounds");
    if(y < 0 || y >= this.height) throw new Error("Y out of bounds");
    var dat = pixel.toBuffer();
    dat.copy(this.data, (y * this.width + x) * this.channels);
  };

  this.scale = function(width, height) {
    var ret = new Image(width, height, this.channels);
    var sampleSquareWidth = this.width / width;
    var sampleSquareHeight = this.height / height;
    for(var x=0;x<width;x++) {
      for(var y=0;y<height;y++) {
        /* Attempt to get the pixel x% over, y% down, and in the middle of said region */
        ret.setPixel(x,y,this.getPixel(Math.floor(x / width * this.width + sampleSquareWidth / 2),
                     Math.floor(y / height * this.height + sampleSquareHeight / 2)));
      }
    }
    return ret;
  };

  /* Preserves aspect ratio */
  this.sample = function(width, height) {
    if(width / height > this.width / this.height) {
      return this.scale(Math.round(width * this.width / this.height), height);
    } else {
      return this.scale(width, Math.round(height * this.width / this.height));
    }
  };
}

module.exports = Image;
