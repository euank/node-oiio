{
  "targets": [
  {
    "target_name": "nodeoiio",
    "sources": [ "node-oiio.cc", "Image.cpp", "Image.hpp" ],
    "libraries": ["-lOpenImageIO"],
    "cflags": ["-std=c++0x"],
    "cflags!": ["-fno-exceptions"],
    "cflags_cc!": ["-fno-exceptions"]
  }
  ]
}
