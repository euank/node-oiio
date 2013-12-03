var oiio = require('./build/Release/nodeoiio');
var Pixel = require("./pixel");
var is = require('is');
var extend = require('node.extend');

var slice = function(arr) {
  return Array.prototype.slice.call(arr);
};

var arrayFill = function(arr, val) {
  for(var i=0;i<arr.length;i++) {
    arr[i] = val;
  }
  return arr;
};

/*
 * new Image(filename)
 * new Image(otherImage)
 * new Image(data, width, height, channels)
 * new Image(width, height, channels)
 */
function Image(varargs) {
  var img = {
    channelnames: null
  };
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
    img.path = null;
  } else if(args.length == 3) {
    img.width = args[0];
    img.height = args[1];
    img.channels = args[2];
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
  if(this.channelnames === null) {
    this.channelnames = this.channels == 3 ? "RGB" 
                     : this.channels == 4 ? "RGBA" 
                     : this.channels == 1 ? "I"
                     : Array(this.channels.length+1).join('C');
  }

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
    var startOffset = (y * this.width + x) * this.channels;
    return new Pixel(this.data.slice(startOffset, startOffset + this.channels));
  };

  this.setPixel = function(x, y, pixel) {
    if(x < 0 || x >= this.width) throw new Error("X out of bounds");
    if(y < 0 || y >= this.height) throw new Error("Y out of bounds");
    var dat = pixel.toBuffer();
    dat.copy(this.data, (y * this.width + x) * this.channels, 0, this.channels);
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

  this.grayScale = function() {
    var ret = new Image(this.width, this.height, 1);
    for(var x=0;x<this.width;x++) {
      for(var y=0;y<this.height;y++) {
        var pix = this.getPixel(x, y);
        var grayscalePixel = pix.desaturate();
        var onedpixel = new Pixel(grayscalePixel.getRGBAvg());
        ret.setPixel(x,y,onedpixel);
      }
    }
    return ret;
  };

  /* Gaussian blur */
  this.blur = function(radius, sigma) {
    /* horizontal pass */
    var r1,r2;
    var sigma2 = sigma * sigma;
    /* Create gaussian matrix */
    var quarterBlur = Array(radius+1);
    for(r1=0;r1<radius+1;r1++) {
      quarterBlur[r1] = Array(radius+1);
      for(r2=0;r2<radius+1;r2++) {
        quarterBlur[r1][r2] = 1 / (2 * Math.PI * sigma2) * 
          Math.pow(Math.E, -1 * ((r1 * r1 + r2 * r2) / (2 * sigma2)));
      }
    }
    /* normalize */
    var matrixSum = 0;
    for(r1=-radius;r1<radius+1;r1++) {
      for(r2=-radius;r2<radius+1;r2++) {
        matrixSum += quarterBlur[Math.abs(r1)][Math.abs(r2)];
      }
    }
    for(r1=0;r1<radius+1;r1++) {
      for(r2=0;r2<radius+1;r2++) {
        quarterBlur[r1][r2] /= matrixSum;
      }
    }
    //Here we go. We're about to slow to a crawl
    var ret = new Image(this);
    for(var x=0;x<this.width;x++) {
      for(var y=0;y<this.height;y++) {
        var thisPixel = new Pixel(arrayFill(Array(this.channels.length), 0));
        for(r1=-radius;r1<radius+1;r1++) {
          for(r2=-radius;r2<radius+1;r2++) {
            var r11 = r1;
            var r21 = r2;
            if(x+r1 < 0 || x+r1 >= this.width) r11 = -r1;
            if(y+r2 < 0 || y+r2 >= this.height) r21 = -r2;
            thisPixel = thisPixel.plus(this.getPixel(x+r11, y+r21).scaledBy(quarterBlur[Math.abs(r11)][Math.abs(r21)]));
          }
        }
        this.setPixel(x,y,thisPixel);
      }
    }
    return ret;
  };
}



module.exports = Image;
