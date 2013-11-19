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

  node::Buffer *slowbuff = node::Buffer::New(img.pixels.size());
  memcpy(node::Buffer::Data(slowbuff), &img.pixels[0], img.pixels.size());

  /* See http://sambro.is-super-awesome.com/2011/03/03/creating-a-proper-buffer-in-a-node-c-addon/
   * for why this code is needed to make a real buffer 
   */
  Local<Object> globalObj = Context::GetCurrent()->Global();
  Local<Function> bufferConstructor = Local<Function>::Cast(globalObj->Get(String::New("Buffer")));
  Handle<Value> constructorArgs[3] = { slowbuff->handle_, v8::Integer::New(img.pixels.size()), v8::Integer::New(0) };
  Local<Object> buff = bufferConstructor->NewInstance(3, constructorArgs);

  Local<Object> obj = Object::New();
  obj->Set(String::NewSymbol("data"), buff);
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
  if(!(args[0]->IsString() && args[1]->IsObject() && args[2]->IsNumber() && args[3]->IsNumber() && args[4]->IsNumber())) {
    ThrowException(Exception::TypeError(String::New("Invalid arguments")));
    return scope.Close(Undefined());
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
    ThrowException(Exception::RangeError(String::New("Buffer size is wrong")));
    return scope.Close(Undefined());
  }

  euank::cpsc404::Image::Write(filename, pixels, width, height, channels);
  if(euank::cpsc404::Image::errflag) {
    return scope.Close(Undefined());
  }

  return scope.Close(True());
}

void init(Handle<Object> exports) {
  exports->Set(String::NewSymbol("read"),
      FunctionTemplate::New(ReadImage)->GetFunction());
  exports->Set(String::NewSymbol("write"),
      FunctionTemplate::New(WriteImage)->GetFunction());
}

NODE_MODULE(nodeoiio, init)
