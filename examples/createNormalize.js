var Image = require("../image");

var i = new Image('cat.png');

i2 = i.normalize();

i2.write('catnormalize.png');
