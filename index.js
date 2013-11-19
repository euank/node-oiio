var oiio = require('./build/Release/nodeoiio');

function Image(filename) {
  var i = oiio.read(filename);
  for(var prop in i) {
    if(i.hasOwnProperty(prop)) {
      this[prop] = i[prop];
    }
  }


  this.write = function(filename) {
    oiio.write(filename, this.data, this.width, this.height, this.channels);
  }
}

module.exports = Image;
