{
  "targets": [
  {
    "target_name": "nodeoiio",
    "sources": [ "node-oiio.cc", "Image.cpp", "Image.hpp" ],
    "libraries": ["-lOpenImageIO"],
    "cflags": ["-std=c++0x", "-fexceptions"],
    "cflags_cc": ["-fexceptions"],
    "include_dirs": ["<!(node -e \"require('nan')\")"]
  }
  ]
}
