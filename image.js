
var oiio = require('./build/Release/nodeoiio');
var Pixel = require("./pixel");


function Image(filename) {
  var i = oiio.read(filename);
  /* Add anything returned in read to here explicitly */
  this.data = i.data;
  this.width = i.width;
  this.height = i.height;
  this.channels = i.channels;
  this.channelnames = i.channelnames;

  this.write = function(filename) {
    oiio.write(filename, this.data, this.width, this.height, this.channels);
  };

  /* If this were ECMAScript 6 we'd be able to use a Proxy here.
   * It would still be nice to use it if --harmony is used in node.
   * For now, we'll do it with explicit "get/set" functions and
   * perhaps fix it to use a Proxy once that's standardized. Soon!
   */
  this.getPixel = function(x, y) {
    if(x < 0 || x >= this.width) throw new Error("X out of bounds");
    if(y < 0 || y >= this.height) throw new Error("Y out of bounds");
    return new Pixel(this.data.slice((y * this.width + x) * this.channels,
                                      (y * this.width + x) * this.channels + this.channels));
  };

  this.setPixel = function(x, y, pixel) {
    if(x < 0 || x >= this.width) throw new Error("X out of bounds");
    if(y < 0 || y >= this.height) throw new Error("Y out of bounds");
    var dat = pixel.toBuffer();
    dat.copy(this.data, (y * this.width + x) * this.channels);
  };


}

module.exports = Image;
