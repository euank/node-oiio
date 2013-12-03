node-oiio
=========

Node wrapper for OpenImageIO

This was created as part of an assignment for a computer graphics course.

Goal
----

This wrapper aims to allow reading and writing a wide variety 
of image formats via OpenImageIO. 

Limitations
-----------

No attempts are made to retain all data for floating point
image formats. Everything is assumed to fit into UINT8 per
channel per pixel.

Usage
-----

```
var Image = require("node-oiio");
/* Pixel is likely not needed to be included. 
   It's what image.getPixel returns, which
   is how you'll more likely work with it */
var Pixel = require("node-oiio/pixel");

var img = new Image('lena.png');
var smallImg = img.scale(50, 50);
smallImg.write('smalllena.png');
```

Installing
---------

_After_ you get libOpenImageIO you can simply `npm install node-oiio`

This library depends on libOpenImageIO being available. On
Gentoo `emerge media-libs/openimageio` and node-gyp being
available should be sufficient.

If anyone wants to alter it so that it downloads and locally compiles OIIO to link against,
that would probably be better.
