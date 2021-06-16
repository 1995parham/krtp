import { Session, ReadRTPStream, WriteRTPStream } from "..";

const s = new Session(1372);
const r = new ReadRTPStream(s);
const w = new WriteRTPStream(s, "127.0.0.1");

r.on("data", (chunk) => {
  console.log(chunk.toString());
});

w.write("Hello Elahe");
w.write("I am Parham");
