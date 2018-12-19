const through = require('through');

const packetize = module.exports = {};

packetize.encode = function (options) {
  const opts = Object.assign({
    base64: false, // Whether to use encoding for non-binary-safe transports
  }, options || {});


  return through(function (chunk) {
    chunk = Buffer.from(chunk);

    if (opts.base64) {

      // Write data
      while (chunk.length) {
        let data = chunk.slice(0, 54); // 54 bytes = 72 characters
        chunk    = chunk.slice(data.length);
        this.queue(data.toString('base64') + '\n');
      }

      // Package separation
      this.queue('\n');

    } else {

      // Build size buffer
      let size = Buffer.alloc(4);
      size.writeUInt32BE(chunk.length, 0);
      size[0] |= 128;

      // Write data
      this.queue(size);
      this.queue(chunk);
    }
  });
};

packetize.decode = function (options) {
  const opts = Object.assign({}, options || {});

  /** @var {Buffer}         buf  */
  /** @var {Number}         size */
  /** @var {Boolean|String} mode */
  let buf  = Buffer.alloc(0),
      size = -1,
      mode = false;

  return through(function (chunk) {
    if (null === chunk) return;

    // Add chunk to buffer
    buf = Buffer.concat([buf, Buffer.from(chunk)]);

    // Try to output packages
    loop:
      while (true) {

        // Buffer empty = done
        if (!buf.length) break;

        // Detect transport mode
        if (!mode) {
          if (buf[0] & 128) {
            mode = 'binary';
          } else {
            mode = 'base64';
          }
        }

        // Handle data
        switch (mode) {
          case 'binary':

            // Detect packet size
            if (!~size) {
              if (buf.length<4) break loop;
              buf[0] -= 128;
              size = buf.readUInt32BE(0);
              buf  = buf.slice(4);
            }

            // Emit data or finish loop
            if (buf.length >= size) {
              this.emit('data', buf.slice(0,size));
              buf = buf.slice(size);
              size = -1;
            } else {
              break loop;
            }

            break;
          case 'base64':
            let separator = buf.indexOf('\n\n');
            if (~separator) {
              this.emit('data', Buffer.from(buf.slice(0, separator).toString(), 'base64'));
              buf = buf.slice(separator + 2);
            } else {
              break loop;
            }
            break;
        }
      }

  });
};
