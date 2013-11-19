#include <string>
#include <node.h>
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
Handle<Value> ReadImage(const Arguments& args) {
  HandleScope scope;
  if(!args[0]->IsString()) {
    ThrowException(Exception::TypeError(String::New("Wrong arguments")));
  }
  euank::cpsc404::Image img(std::string(*v8::String::Utf8Value(args[0]->ToString())));
  if(euank::cpsc404::Image::errflag) {
    return scope.Close(Undefined());
  }

  node::Buffer *buff = node::Buffer::New(img.pixels.size());
  memcpy(node::Buffer::Data(buff), &img.pixels[0], img.pixels.size());
  Local<Object> obj = Object::New();
  obj->Set(String::NewSymbol("pixels"), buff->handle_);
  obj->Set(String::NewSymbol("width"),Number::New(img.width));
  obj->Set(String::NewSymbol("height"), Number::New(img.height));
  obj->Set(String::NewSymbol("channels"), Number::New(img.channels));
  obj->Set(String::NewSymbol("channelnames"), String::New(img.channelnames.c_str()));

  //return scope.Close(buff->handle_);
  return scope.Close(obj);
}

/*
 * Writes an image to a filename
 *
 * args are (filename: string, pixels: Buffer, width: Integer, height: Integer, channels: Integer
 */

Handle<Value> WriteImage(const Arguments& args) {
  HandleScope scope;
  if(args.Length() != 5) {
    ThrowException(Exception::TypeError(String::New("Wrong number of arguments")));
    return scope.Close(Undefined());
  }
  return scope.Close(Undefined());
}

void init(Handle<Object> exports) {
  exports->Set(String::NewSymbol("read"),
      FunctionTemplate::New(ReadImage)->GetFunction());
  exports->Set(String::NewSymbol("write"),
      FunctionTemplate::New(WriteImage)->GetFunction());
}

NODE_MODULE(nodeoiio, init)
