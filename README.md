<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:25D366,100:075E54&height=220&section=header&text=Miracle%20Baileys&fontSize=62&fontColor=ffffff&fontAlignY=38&animation=fadeIn&desc=WhatsApp%20Multi-Device%20Library%20for%20Node.js&descSize=18&descAlignY=60" width="100%" alt="Miracle Baileys" />

<a href="https://github.com/FyzzModss/miracle">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&duration=3000&pause=900&color=25D366&center=true&vCenter=true&width=620&lines=Stable+pairing+%26+authentication;Custom+pairing+code+support;Interactive+messages+%26+buttons;Resilient+session+management;Built+for+production+bots" alt="Typing animation" />
</a>

<br/>

<img src="https://img.shields.io/badge/NODE.JS-%E2%89%A5%2018-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
<img src="https://img.shields.io/badge/WHATSAPP-MULTI--DEVICE-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
<img src="https://img.shields.io/badge/miracle-CB3837?style=for-the-badge&logo=npm&logoColor=white" />
<img src="https://img.shields.io/badge/LICENSE-PROPRIETARY-0A0A0A?style=for-the-badge" />

<br/><br/>

<img src="https://files.catbox.moe/mx4gi6.jpg" alt="Miracle Baileys" width="520" />

</div>

<br/>

## Overview

**Miracle Baileys** is a WhatsApp multi-device client library focused on **connection reliability** and **developer experience**. It resolves common pairing and authentication failures, ships first-class interactive message support, and manages sessions automatically so long-running bots stay online.

<br/>

## Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🛜 Pairing</h3>
      Automatic and custom pairing code flows with fixes for failed or interrupted pairing.
    </td>
    <td width="50%" valign="top">
      <h3>⚠️ Authentication</h3>
      Hardened auth handling that reduces unexpected disconnects and re-login loops.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>💬 Interactive Messages</h3>
      Buttons, native flows, lists, and dynamic menus out of the box.
    </td>
    <td valign="top">
      <h3>♻️ Session Management</h3>
      Automatic persistence and recovery for long-term uptime.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>🌐 Multi-Device</h3>
      Compatible with current WhatsApp multi-device behavior.
    </td>
    <td valign="top">
      <h3>📡 Lightweight</h3>
      Minimal footprint and easy to embed into existing services.
    </td>
  </tr>
</table>

<br/>

## Installation

```bash
npm install github:FyzzModss/miracle
```

> Requires **Node.js** `>= 20.0.0`

<br/>

## Quick Start

```js
const { default: makeWASocket, useMultiFileAuthState } = require('miracle-xbailz')

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  // Request a pairing code for an unregistered session
  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode('628xxxxxxxxxx')
    console.log('Pairing code:', code)
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return
    await sock.sendMessage(m.key.remoteJid, { text: 'Hello from Miracle Baileys' })
  })
}

start()
```

<br/>

## Use Cases

- Customer support and order-handling bots
- Notification and alerting pipelines
- Multi-session bot platforms
- Internal automation and workflow tooling

<br/>

## Tech Stack

<div align="center">
  <img src="https://skillicons.dev/icons?i=nodejs,js,npm,git,github&theme=dark" />
</div>

<br/>

## Project Structure

```
miracle/
├── lib/         Core library source
├── WAProto/     WhatsApp protocol definitions
├── LICENSE
└── package.json
```

<br/>

## Contact

<div align="center">
  <a href="https://www.youtube.com/@FyzzX7"><img src="https://img.shields.io/badge/Youtube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" /></a>
  <a href="https://github.com/FyzzModss"><img src="https://img.shields.io/badge/Github-181717?style=for-the-badge&logo=github&logoColor=white" /></a>
</div>

<br/>

## License

Copyright © 2025 FyzzX7. All rights reserved.

This project is **proprietary and not open source**. You may not copy, modify, redistribute, sell, or claim this software as your own without the author's explicit written permission. Unauthorized use may result in legal action under applicable intellectual property law. See [`LICENSE`](./LICENSE).

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:075E54,100:25D366&height=120&section=footer" width="100%" alt="" />
