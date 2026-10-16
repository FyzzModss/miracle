"use strict";

const gradients = [
    { c1: [255, 80, 120], c2: [255, 180, 210] },
    { c1: [140, 90, 255], c2: [90, 200, 255] },
    { c1: [0, 200, 255], c2: [120, 255, 220] },
    { c1: [255, 170, 0], c2: [255, 255, 120] }
];

const g = gradients[Math.floor(Math.random() * gradients.length)];

const gradient = (text) =>
    text
        .split("")
        .map((ch, i, arr) => {
            const t = i / (arr.length - 1 || 1);

            const r = Math.round(
                g.c1[0] + (g.c2[0] - g.c1[0]) * t
            );

            const gg = Math.round(
                g.c1[1] + (g.c2[1] - g.c1[1]) * t
            );

            const b = Math.round(
                g.c1[2] + (g.c2[2] - g.c1[2]) * t
            );

            return `\x1b[38;2;${r};${gg};${b}m${ch}`;
        })
        .join("") + "\x1b[0m";

const center = (text) => {
    const width = process.stdout.columns || 80;
    const padding = Math.max(
        0,
        Math.floor((width - text.length) / 2)
    );

    return " ".repeat(padding) + text;
};

const gray = "\x1b[38;2;150;150;160m";
const white = "\x1b[38;2;235;235;240m";
const green = "\x1b[38;2;80;255;150m";
const reset = "\x1b[0m";

const title = "M I R A C L E - V X";
const corp = "B A I L E Y S - W H A T S A P P";
const line = "─────────────────────────";

console.log(`
${gradient(center(title))}
${gradient(center(line))}
${gradient(center(corp))}

${green}${center("● SYSTEM ONLINE")}${reset}

  ${white}Version${reset}   ${gray}:${reset} 1.1.11
  ${white}Runtime${reset}   ${gray}:${reset} Node.js
  ${white}Protocol${reset}  ${gray}:${reset} Multi-Device
  ${white}Status${reset}    ${gray}:${reset} ${green}Connected${reset}

${gradient(center(line))}

  ${gradient("› Welcome to Miracle")}
  ${gray}  Ready to process messages.${reset}

${gray}${center("© 2026 Miracle-VX")}${reset}

`);

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));

var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
            __createBinding(exports, m, p);
};

var __importDefault = (this && this.__importDefault) || function(mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};

Object.defineProperty(exports, "__esModule", { value: true });
exports.proto = exports.makeWASocket = void 0;

const WAProto_1 = require("../WAProto");
Object.defineProperty(exports, "proto", {
    enumerable: true,
    get: function() {
        return WAProto_1.proto;
    }
});

const Socket_1 = __importDefault(require("./Socket"));
exports.makeWASocket = Socket_1.default;

__exportStar(require("../WAProto"), exports);
__exportStar(require("./Utils"), exports);
__exportStar(require("./Types"), exports);
__exportStar(require("./Store"), exports);
__exportStar(require("./Defaults"), exports);
__exportStar(require("./WABinary"), exports);
__exportStar(require("./WAM"), exports);
__exportStar(require("./WAUSync"), exports);

exports.default = Socket_1.default;