var assert = require('assert');
var Image = require('..');

describe('Image', function() {
  describe('with lena', function() {
    let img = new Image(`${__dirname}/lena_std.tif`);
    assert.ok(img);

    it('should have basic properties like length', function() {
      assert.equal(img.width, 512);
      assert.equal(img.height, 512);
      assert.equal(img.channels, 3);
      assert.equal(img.channelnames, "RGB");
    });
  });
});
