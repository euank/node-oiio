var Image = require("../image");

var i = new Image('cat.png');

i2 = i.grayScale();

i2.write('catgrayscale.png');
