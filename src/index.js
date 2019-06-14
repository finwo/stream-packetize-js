const EventEmitter = require('simple-ee');

const packetize = module.exports = {};
const mimicDuplex    = {
  readable: true,
  writable: true,
  paused  : false,
};

packetize.encode = function (options) {
  const encoder = EventEmitter(Object.create({
    write: function(chunk) {
      if (null === chunk) return this.end();
      const size = Buffer.alloc(4);
      chunk      = Buffer.from(chunk);
      size.writeUInt32BE(chunk.length,0);
      this.emit('data',size);
      this.emit('data',chunk);
    },
    end: function() {
      this.emit('end');
    },
    pipe: function(destination) {
      this.on('data', function(chunk) {
        destination.write(chunk);
      });
      return destination;
    },
  }));

  Object.assign(encoder,mimicDuplex);
  return encoder;
};

packetize.decode = function (options) {

  const decoder = EventEmitter(Object.create({
    write: function(chunk) {
      if (null === chunk) return this.end();
      this.buffer = Buffer.concat([this.buffer||Buffer.alloc(0),Buffer.from(chunk)]);

      // Try emitting a block
      while(this.buffer.length>=4) {
        let size = this.buffer.readUInt32BE(0);
        if (this.buffer.length < (size+4)) break;
        this.buffer = this.buffer.slice(4);
        this.emit('data',this.buffer.slice(0,size));
        this.buffer = this.buffer.slice(size);
      }
    },
    end: function() {
      this.emit('end');
    },
    pipe: function(destination) {
      this.on('data', function(chunk) {
        destination.write(chunk);
      });
      return destination;
    },
  }));

  Object.assign(decoder,mimicDuplex);
  return decoder;
};
