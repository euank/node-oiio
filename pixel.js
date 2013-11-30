var is = require('is');

var slice = function(arr) {
  return Array.prototype.slice.call(arr);
};

var TYPES = {
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
  } else if(args.length == 3 || args.length == 4 && is.number(args[0])) {
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

  this.toBuffer = function() {
    var ret = new Buffer(this.channels.length);
    for(var i=0;i<this.channels.length;i++) {
      ret[i] = this.channels[i];
    }
    return ret;
  };
  this.clamp = function() {
    for(var i=0;i<this.channels.length;i++) {
      this.channels[i] = Math.max(0, Math.min(255, this.channels[i]));
    }
    return this;
  };
}
Pixel.TYPES = TYPES;

module.exports = Pixel;
