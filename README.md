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

TODO, fill this in after it works

Compiling
---------

This library depends on libOpenImageIO being available. On
Gentoo `emerge media-libs/openimageio` and node-gyp being
available should be sufficient.
