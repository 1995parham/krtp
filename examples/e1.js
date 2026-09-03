import { Session } from "../dist/index.js";

const s = new Session(1373);

s.on("message", (msg) => {
  console.log(msg);
  s.close();
});

s.on("sr", (report, rinfo) => {
  console.log("sender report from", rinfo.address, report);
});

s.sendSR("192.168.73.4").catch((err) => {
  console.log(err);
});
s.send(Buffer.from("Hello world"));
