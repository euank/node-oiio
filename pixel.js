var is = require('is');
var extend = require('node.extend');
var converter = require("color-convert")();

var slice = function(arr) {
  return Array.prototype.slice.call(arr);
};

var TYPES = {
  GRAYSCALE: 'GRAYSCALE',
  RGB: 'RGB',
  RGBA: 'RGBA'
}; // TODO, support more types

//TODO, hardcode some colors. e.g. COLORS.RED = "#FF0000"
//and then take these color names as args to pixel

//TODO, make this a proxy once that hits standards
//so that .R/.G/.B can proxy through to the storage array
//TODO types: string of #FFF/#FFFFFF
function Pixel(fakeArgs) {
  var i;
  var args = slice(arguments);
  this.channels = [];
  if(args.length == 1 && Buffer.isBuffer(args[0])) {
    for(i=0;i<args[0].length;i++) {
      this.channels.push(args[0][i]);
    }
  } else if((args.length == 1 || args.length == 3 || args.length == 4) && is.number(args[0])) {
    for(i=0;i<args.length;i++) {
      if(!is.number(args[i])) throw new TypeError("Invalid argument type. Expected all to be numbers.");
      this.channels.push(args[i]);
    }
  } else if(args.length == 1 && is.array(args[0])) {
    this.channels = slice(args[0]);
  } else {
    console.log(args);
    throw new TypeError("Argument type unsupported for now");
  }
  if(this.channels.length == 3) this.type = TYPES.RGB;
  if(this.channels.length == 4) this.type = TYPES.RGBA;
  if(this.channels.length == 1) this.type = TYPES.GRAYSCALE;

}
Pixel.TYPES = TYPES;
Pixel.prototype.toBuffer = function() {
  var ret = new Buffer(this.channels.length);
  for(var i=0;i<this.channels.length;i++) {
    ret[i] = this.channels[i];
  }
  return ret;
};
Pixel.prototype.clamp = function() {
  var ret = extend(true, {}, this);
  for(var i=0;i<ret.channels.length;i++) {
    ret.channels[i] = Math.max(0, Math.min(255, this.channels[i]));
  }
  return ret;
};

Pixel.prototype.minus = function(rhs) {
  var ret;
  if(rhs.channels.length > this.channels.length) {
    ret = extend(true, {}, rhs);
  } else {
    ret = extend(true, {}, this);
  }
  for(var i=0;i<ret.channels.length;i++) {
    if(rhs.channels.length <= i || this.channels.length <= i) {
      ret.channels[i] = 255; //max diff if the channels don't line up
    } else {
      ret.channels[i] = this.channels[i] - rhs.channels[i];
    }
  }
  return ret;
};
Pixel.prototype.plus = function(rhs) {
  var ret = new Pixel(this.channels);
  for(var i=0;i<this.channels.length;i++) {
    if(rhs.channels.length <= i || this.channels.length <= i) {
      ret.channels[i] = (this.channels.length <= i) ? 255 : this.channels[i];
    } else {
      ret.channels[i] = this.channels[i] + rhs.channels[i];
    }
  }
  return ret;
};
Pixel.prototype.abs = function() {
  var ret = extend(true, {}, this);
  for(var i=0;i<this.channels.length;i++) {
    ret.channels[i] = Math.abs(this.channels[i]);
  }
  return ret;
};
Pixel.prototype.getAvg = function() {
  var total = 0;
  for(var i=0;i<this.channels.length;i++) {
    total += this.channels[i];
  }
  return total / this.channels.length;
};
Pixel.prototype.getRGBAvg = function() {
  var total = 0;
  var numChans = this.channels.length == 4 ? 3 : this.channels.length;
  for(var i=0;i<numChans;i++) {
    total += this.channels[i];
  }
  return total / numChans;

};
Pixel.prototype.desaturate = function() {
  var ret = extend(true, {}, this);
  if(this.channels.length >= 3) {
    var hsl = converter.rgb(this.channels.slice(0,3)).hsl();
    hsl[1] = 0;
    var rgb = converter.hsl(hsl).rgb();
    ret.channels[0] = rgb[0];
    ret.channels[1] = rgb[1];
    ret.channels[2] = rgb[2];
  }
  return ret;
};

Pixel.prototype.scaledBy = function(val) {
  var ret = new Pixel(this.channels);
  for(var i=0;i<ret.channels.length;i++) {
    ret.channels[i] *= val;
  }
  return ret;
};

module.exports = Pixel;
