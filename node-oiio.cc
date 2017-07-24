#include <string>
#include <node.h>
#include <nan.h>
#include <node_buffer.h>
#include <v8.h>
#include "Image.hpp"

using namespace v8;

/*
 * Takes a filename to open with openimage io.
 *
 * args is a string filename
 *
 * returns on object of the format:
 * {pixels: Buffer, width: Integer, height: Integer, channels: Integer, channelnames: String}
 *
 * Throws a typeerror if args are wrong. Returns undefined if it can't open the image
 */
void ReadImage(const Nan::FunctionCallbackInfo<Value>& args) {
  if(!args[0]->IsString()) {
    Nan::ThrowTypeError("Wrong arguments");
    return;
  }
  euank::cpsc404::Image img(std::string(*v8::String::Utf8Value(args[0]->ToString())));
  if(euank::cpsc404::Image::errflag) {
    return;
  }

  auto buff = Nan::NewBuffer((char *)&img.pixels[0], img.pixels.size());
  auto obj = Nan::New<v8::Object>();
  obj->Set(Nan::New("data").ToLocalChecked(), buff.ToLocalChecked());
  obj->Set(Nan::New("width").ToLocalChecked(),
      Nan::New((uint32_t)img.width));
  obj->Set(Nan::New("height").ToLocalChecked(),
      Nan::New((uint32_t)img.height));
  obj->Set(Nan::New("channels").ToLocalChecked(),
      Nan::New(img.channels));
  obj->Set(Nan::New("channelnames").ToLocalChecked(),
      Nan::New<v8::String>(img.channelnames).ToLocalChecked());

  args.GetReturnValue().Set(obj);
}

/*
 * Writes an image to a filename
 *
 * args are (filename: string, pixels: Buffer, width: Integer, height: Integer, channels: Integer
 */
void WriteImage(const Nan::FunctionCallbackInfo<Value>& args) {
  if(args.Length() != 5) {
    Nan::ThrowTypeError("Wrong number of arguments");
    return;
  }
  if(!(args[0]->IsString() && args[1]->IsObject() && args[2]->IsNumber() && args[3]->IsNumber() && args[4]->IsNumber())) {
    Nan::ThrowTypeError("Invalid arguments");
    return;
  }
  std::string filename = std::string(*v8::String::Utf8Value(args[0]->ToString()));
  uint64_t width = args[2]->Uint32Value();
  uint64_t height = args[3]->Uint32Value();
  uint64_t channels = args[4]->Uint32Value();
  uint8_t *pixels;
  /* now we have to get the data out of the nodejs Buffer obj back.. */
  Local<Object> buffObj = args[1]->ToObject();
  pixels = (uint8_t *)node::Buffer::Data(buffObj);
  size_t size = node::Buffer::Length(buffObj);
  if(size != (width * height * channels)) {
    Nan::RangeError("Buffer size is wrong");
    return;
  }

  euank::cpsc404::Image::Write(filename, pixels, width, height, channels);
  if(euank::cpsc404::Image::errflag) {
    return;
  }
  args.GetReturnValue().Set(Nan::True());
}

void init(Local<Object> exports, Local<Object> module) {
  exports->Set(Nan::New("read").ToLocalChecked(),
      Nan::New<FunctionTemplate>(ReadImage)->GetFunction());
  exports->Set(Nan::New("write").ToLocalChecked(),
      Nan::New<FunctionTemplate>(WriteImage)->GetFunction());
}

NODE_MODULE(nodeoiio, init)
