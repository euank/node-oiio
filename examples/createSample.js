var Image = require("../image");

var i = new Image('cat.png');

i2 = i.sample(160,160);

i2.write('catsample.png');
