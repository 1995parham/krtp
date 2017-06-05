const RTPSession = require('..').RTPSession;

const s = new RTPSession(1373);

s.on('message', (msg) => {
    console.log(msg);
    s.close();
});

s.sendSR('192.168.73.2').catch(err => {
  console.log(err);
});
s.send(Buffer.from('Hello world'));
