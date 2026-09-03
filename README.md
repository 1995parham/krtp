<div align="center">
<h1>Koochooloo RTP</h1>

<img alt="NPM Version" src="https://img.shields.io/npm/v/krtp?style=for-the-badge&logo=npm">
<img alt="NPM Downloads" src="https://img.shields.io/npm/dw/krtp?style=for-the-badge&logo=npm">
<img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/1995parham/krtp/test.yaml?style=for-the-badge&logo=github">

</div>

- [Introduction](#introduction)
- [Installation](#installation)
- [Example](#example)
- [Protocol Documentation](https://github.com/1995parham/krtp/blob/main/docs/RTP.md)

## Introduction

RealTime Protocol implementation based on [RFC 3550](https://tools.ietf.org/html/rfc3550) in NodeJS. It supports RTP and SR message of RTCP. All contributions are welcome. KRTP has support for rxjs and Node streams.

## Installation

```bash
npm install krtp
```

krtp is an ES module and requires Node.js 20 or newer.

## Example

```javascript
import { Session } from "krtp";

const s = new Session(1373);

s.on("message", (msg) => {
  console.log(msg);
  s.close();
});

s.sendSR("192.168.73.4").catch((err) => {
  console.log(err);
});
s.send(Buffer.from("Hello world"));
```

```typescript
import { Session } from "krtp";

const s = new Session(1372);
s.message$.subscribe((msg) => console.log(msg));
```

A session binds the RTP port and the RTCP port (port + 1). Malformed datagrams are dropped and reported through the `error` event when a listener is attached; they never crash the process. Incoming sender reports are emitted as `sr` events or through the `sr$` observable.
