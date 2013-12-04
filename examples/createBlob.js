var Image = require("../image");

var i = new Image('cat.png');

var blob = i.sample(160,160).grayScale().blur(3,99).normalize().sample(16,16);
blob.write("catblob.png");
console.log(blob.binaryBlob());
