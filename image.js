var oiio = require('./build/Release/nodeoiio');
var Pixel = require("./pixel");
var is = require('is');
var extend = require('node.extend');

var slice = function(arr) {return Array.prototype.slice.call(arr);};

var arrayFill = function(len, val) {
  var arr = [];
  for(var i=0;i<len;i++) {
    arr.push(val);
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
    if(typeof img == 'undefined') {
      throw new TypeError("Invalid image type");
    }
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

}

Image.prototype.write = function(filename) {
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
Image.prototype.getPixel = function(x, y) {
  if(x < 0 || x >= this.width) throw new Error("X out of bounds: " + x);
  if(y < 0 || y >= this.height) throw new Error("Y out of bounds: " + y);
  var startOffset = (y * this.width + x) * this.channels;
  return new Pixel(this.data.slice(startOffset, startOffset + this.channels));
};

Image.prototype.setPixel = function(x, y, pixel) {
  if(arguments.length !== 3) throw new Error("Invalid arguments");
  if(x < 0 || x >= this.width) throw new Error("X out of bounds");
  if(y < 0 || y >= this.height) throw new Error("Y out of bounds");
  var dat = pixel.toBuffer();
  dat.copy(this.data, (y * this.width + x) * this.channels, 0, this.channels);
};

Image.prototype.scale = function(width, height) {
  if(width == this.width && height == this.height) return new Image(this);
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
Image.prototype.sample = function(width, height) {
  if(width / height > this.width / this.height) {
    return this.scale(Math.round(width * this.width / this.height), height);
  } else {
    return this.scale(width, Math.round(height * this.width / this.height));
  }
};

Image.prototype.grayScale = function() {
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
Image.prototype.blur = function(radius, sigma) {
  /* horizontal pass */
  var r1,r2,x,y;
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
  /* precache pixel objects */
  var ret = new Image(this);
  var pixelArr = [];
  for(x=0;x<this.width;x++) {
    var pixelRow = [];
    for(y=0;y<this.height;y++) {
      pixelRow.push(this.getPixel(x,y));
    }
    pixelArr.push(pixelRow);
  }
  for(x=0;x<ret.width;x++) {
    for(y=0;y<ret.height;y++) {
      var thisPixel = new Pixel(arrayFill(ret.channels, 0));

      for(r1=-radius;r1<radius+1;r1++) {
        for(r2=-radius;r2<radius+1;r2++) {
          var r11 = r1;
          var r21 = r2;
          if(x+r1 < 0 || x+r1 >= ret.width) r11 = -r1;
          if(y+r2 < 0 || y+r2 >= ret.height) r21 = -r2;
          thisPixel.plus(new Pixel(pixelArr[x+r11][y+r21]).scaledBy(quarterBlur[Math.abs(r11)][Math.abs(r21)]));
        }
      }
      ret.setPixel(x,y,thisPixel);
    }
  }
  return ret;
};

Image.prototype.normalize = function(min, max) {
  if(typeof min == 'undefined') min = 0;
  if(typeof max == 'undefined') max = 255;
  var x,y;
  var ret = new Image(this);
  var pixelArr = [];
  for(x=0;x<ret.width;x++) {
    var pixelRow = [];
    for(y=0;y<ret.height;y++) {
      pixelRow.push(ret.getPixel(x,y));
    }
    pixelArr.push(pixelRow);
  }
  var chansThatMatter = ret.channels >= 3 ? 3 : ret.channels == 2 ? 1 : ret.channels;
  for(var i=0;i<chansThatMatter;i++) {
    var minIntensity = Math.min.apply(null,pixelArr.map(function(row) {return Math.min.apply(null,row.map(function(item) {return item.channels[i];}));}));
    var maxIntensity = Math.max.apply(null,pixelArr.map(function(row) {return Math.max.apply(null,row.map(function(item) {return item.channels[i];}));}));
    for(x=0;x<ret.width;x++) {
      for(y=0;y<ret.height;y++) {
        pixelArr[x][y].channels[i] = (pixelArr[x][y].channels[i] - minIntensity) * (max - min) / (maxIntensity - minIntensity) + min;
      }
    }
  }
  for(x=0;x<ret.width;x++) {
    for(y=0;y<ret.height;y++) {
      ret.setPixel(x,y,pixelArr[x][y]);
    }
  }
  return ret;
};

Image.prototype.threshold = function(val) {
  if(typeof val == 'undefined') val = 128;
  var ret = new Image(this);
  var x,y;
  for(x=0;x<this.width;x++) {
    for(y=0;y<this.height;y++) {
      var pix = ret.getPixel(x,y);
      if(pix.getAvg() > val) ret.setPixel(x,y,pix.maxValue());
      else ret.setPixel(x,y,pix.minValue());
    }
  }
  return ret;
}

Image.prototype.binaryBlob = function() {
  var x,y;
  var ret = new Buffer(Math.ceil(this.width * this.height / 8));
  console.log(ret);
  for(x=0;x<ret.length;x++) {
    ret[x] = 0;
  }
  for(x=0;x<this.width;x++) {
    for(y=0;y<this.height;y++) {
      var on = this.getPixel(x,y).getAvg() > 128 ? 1 : 0;
      ret[Math.floor((y * this.width + x) / 8)] |= (on << (y * this.width + x) % 8);
    }
  }
  return ret;
};

/* These are the moments referred to by Stricker & Orengo's paper ``Similarity of color images'' */
Image.prototype.getMoments = function() {
  var moments = [];
  var i,x,y,pix;
  for(i=0;i<this.channels;i++) {
    moments.push({
      average: 0,
      variance: 0,
      skewness: 0
    });
  }
  for(x=0;x<this.width;x++) {
    for(y=0;y<this.height;y++) {
      pix = this.getPixel(x,y);
      for(i=0;i<pix.channels.length;i++) {
        moments[i].average += pix.channels[i];
      }
    }
  }
  for(i=0;i<moments.length;i++) {
    moments[i].average /= (this.width*this.height);
  }
  for(x=0;x<this.width;x++) {
    for(y=0;y<this.height;y++) {
      pix = this.getPixel(x,y);
      for(i=0;i<pix.channels.length;i++) {
        var diff = pix.channels[i] - moments[i].average;
        moments[i].variance += diff * diff;
        moments[i].skewness += diff * diff * diff;
      }
    }
  }
  for(i=0;i<moments.length;i++) {
    moments[i].variance /= (this.width*this.height);
    moments[i].skewness /= (this.width*this.height);
    moments[i].variance = Math.sqrt(moments[i].variance);
    if(moments[i].skewness < 0) {
      moments[i].skewness = -1 * Math.pow(-1 * moments[i].skewness, 1/3);
    } else {
      moments[i].skewness = Math.pow(moments[i].skewness, 1/3);
    }
  }
  return moments;
};

module.exports = Image;
