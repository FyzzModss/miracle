"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIDMappingStore = void 0;
const WABinary_1 = require("../WABinary");

/**
 * Persistent PN <-> LID mapping store.
 * WhatsApp's LID is a separate identifier; it must never be converted to a PN
 * by simply replacing the JID domain.
 */
class LIDMappingStore {
    constructor(keys, logger, pnToLIDFunc) {
        this.keys = keys;
        this.logger = logger;
        this.pnToLIDFunc = pnToLIDFunc;
        this.cache = new Map();
        this.inflight = new Map();
    }
    _decode(jid) {
        return (0, WABinary_1.jidDecode)(jid);
    }
    _baseJid(jid, user, server) {
        const decoded = this._decode(jid);
        const device = decoded?.device;
        return (0, WABinary_1.jidEncode)(user, server, device);
    }
    async storeLIDPNMappings(pairs) {
        if (!Array.isArray(pairs) || pairs.length === 0) return;
        const values = {};
        const resolved = [];
        for (const item of pairs) {
            if (!item) continue;
            let { lid, pn } = item;
            // Accept either order defensively, but persist a canonical { lid, pn } pair.
            if (((0, WABinary_1.isJidUser)(lid) || (0, WABinary_1.isHostedPnUser)(lid)) && ((0, WABinary_1.isLidUser)(pn) || (0, WABinary_1.isHostedLidUser)(pn))) [lid, pn] = [pn, lid];
            if (!((0, WABinary_1.isLidUser)(lid) || (0, WABinary_1.isHostedLidUser)(lid)) || !((0, WABinary_1.isJidUser)(pn) || (0, WABinary_1.isHostedPnUser)(pn))) continue;
            const lidDecoded = this._decode(lid);
            const pnDecoded = this._decode(pn);
            if (!lidDecoded?.user || !pnDecoded?.user) continue;
            values[pnDecoded.user] = lidDecoded.user;
            values[`${lidDecoded.user}_reverse`] = pnDecoded.user;
            resolved.push({ lidUser: lidDecoded.user, pnUser: pnDecoded.user });
        }
        if (!resolved.length) return;
        await this.keys.set({ 'lid-mapping': values });
        for (const { lidUser, pnUser } of resolved) {
            this.cache.set(`pn:${pnUser}`, lidUser);
            this.cache.set(`lid:${lidUser}`, pnUser);
        }
        this.logger?.debug?.({ count: resolved.length }, 'stored PN-LID mappings');
    }
    async _getStoredValue(key) {
        if (this.cache.has(key)) return this.cache.get(key);
        const lookup = key.startsWith('pn:') ? key.slice(3) : key.slice(4);
        const dbKey = key.startsWith('pn:') ? lookup : `${lookup}_reverse`;
        const found = await this.keys.get('lid-mapping', [dbKey]);
        const value = found?.[dbKey];
        if (typeof value === 'string' && value) {
            this.cache.set(key, value);
            this.cache.set(key.startsWith('pn:') ? `lid:${value}` : `pn:${value}`, lookup);
            return value;
        }
        return null;
    }
    async getLIDForPN(pn) {
        return (await this.getLIDsForPNs([pn]))?.[0]?.lid || null;
    }
    async getLIDsForPNs(pns) {
        if (!Array.isArray(pns) || pns.length === 0) return null;
        const resolved = [];
        const missing = [];
        for (const pn of [...new Set(pns)]) {
            if (!(0, WABinary_1.isJidUser)(pn) && !(0, WABinary_1.isHostedPnUser)(pn)) continue;
            const decoded = this._decode(pn);
            if (!decoded?.user) continue;
            const lidUser = await this._getStoredValue(`pn:${decoded.user}`);
            if (lidUser) {
                const server = decoded.server === 'hosted' ? 'hosted.lid' : 'lid';
                resolved.push({ pn, lid: this._baseJid(pn, lidUser, server) });
            } else {
                missing.push(pn);
            }
        }
        if (missing.length && typeof this.pnToLIDFunc === 'function') {
            const key = missing.slice().sort().join(',');
            let promise = this.inflight.get(key);
            if (!promise) {
                promise = Promise.resolve().then(() => this.pnToLIDFunc(missing));
                this.inflight.set(key, promise);
            }
            try {
                const fetched = await promise;
                if (Array.isArray(fetched) && fetched.length) {
                    await this.storeLIDPNMappings(fetched);
                    for (const pair of fetched) {
                        if (!((0, WABinary_1.isJidUser)(pair.pn) || (0, WABinary_1.isHostedPnUser)(pair.pn)) || !((0, WABinary_1.isLidUser)(pair.lid) || (0, WABinary_1.isHostedLidUser)(pair.lid))) continue;
                        const requested = missing.find(p => this._decode(p)?.user === this._decode(pair.pn)?.user);
                        if (!requested) continue;
                        const reqDecoded = this._decode(requested);
                        const lidDecoded = this._decode(pair.lid);
                        resolved.push({ pn: requested, lid: this._baseJid(requested, lidDecoded.user, reqDecoded.server === 'hosted' ? 'hosted.lid' : 'lid') });
                    }
                }
            } catch (error) {
                this.logger?.debug?.({ error, pns: missing }, 'failed to retrieve PN-LID mappings');
            } finally {
                this.inflight.delete(key);
            }
        }
        const unique = new Map();
        for (const entry of resolved) unique.set(entry.pn, entry);
        return unique.size ? [...unique.values()] : null;
    }
    async getPNForLID(lid) {
        return (await this.getPNsForLIDs([lid]))?.[0]?.pn || null;
    }
    async getPNsForLIDs(lids) {
        if (!Array.isArray(lids) || lids.length === 0) return null;
        const results = [];
        for (const lid of [...new Set(lids)]) {
            if (!(0, WABinary_1.isLidUser)(lid) && !(0, WABinary_1.isHostedLidUser)(lid)) continue;
            const decoded = this._decode(lid);
            if (!decoded?.user) continue;
            const pnUser = await this._getStoredValue(`lid:${decoded.user}`);
            if (pnUser) {
                const server = decoded.server === 'hosted.lid' ? 'hosted' : 's.whatsapp.net';
                results.push({ lid, pn: this._baseJid(lid, pnUser, server) });
            }
        }
        return results.length ? results : null;
    }
}
exports.LIDMappingStore = LIDMappingStore;
