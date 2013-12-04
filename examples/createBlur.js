var Image = require("../image");

var i = new Image('cat.png');

i2 = i.blur(3,99);

i2.write('catblur.png');
