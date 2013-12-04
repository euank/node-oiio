var Image = require("../image");

var i = new Image('cat.png');

i2 = i.sample(160,160).blur(3,99).grayScale();

i2.write('catall.png');
