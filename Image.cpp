/**
 * @file Image.cpp
 *
 * @brief Methods to read and write images using OpenImageIO
 * @date 2013-10-22
 *
 * Internally everything is stored as uint8_t.. We're wasting memory and
 * there's a loss-of-precision for double formats, but that's kinda par
 * for the course. The right way to handle this would probably be c++ generics.
 *
 * @author EuanK <euank@clemson.edu>
 */
#include "Image.hpp"
#include <OpenImageIO/imageio.h>
#include <cstdint>
#include <string>
OIIO_NAMESPACE_USING

namespace euank {
  namespace cpsc404 {
    bool Image::errflag = false;
    Image::Image(std::string filename) {
      Image::errflag = false;
      ImageInput *in = ImageInput::open(filename);
      this->filename = filename;

      if(!in) {
        Image::errflag = true;
        return;
      }

      const ImageSpec &spec = in->spec();
      width = spec.width;
      height = spec.height;
      channels = spec.nchannels;
      for(uint32_t i=0;i<channels;i++) {
        channelnames += *spec.channelnames[i].rbegin();
      }
      pixels.resize(width*height*channels);


      if(!in->read_image(TypeDesc::UINT8, &pixels[0]) || !in->close()) {
        delete in;
        Image::errflag = true;
        return;
      }
      delete in;
    }

    void Image::Write(std::string outfile, uint8_t *data, int xres, int yres, unsigned int chans) {
      ImageOutput *out = ImageOutput::create(outfile);
      Image::errflag = false;

      if(!out) {
        Image::errflag = true;
        return;
      }

      ImageSpec spec(xres, yres, chans, TypeDesc::UINT8);

      if(!out->open(outfile, spec)) {
        delete out;
        Image::errflag = true;
        return;
      }

      if(!out->write_image(TypeDesc::UINT8, data) || !out->close()) {
        std::string err(out->geterror());
        delete out;
        Image::errflag = true;
        return;
      }
      delete out;
    }

  }
}
