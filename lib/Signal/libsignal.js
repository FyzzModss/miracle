"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLibSignalRepository = makeLibSignalRepository;
const libsignal = __importStar(require("libsignal"));

if (typeof console !== 'undefined' && console.error) {
    const originalConsoleError = console.error;
    console.error = function (...args) {
        if (typeof args[0] === 'string' && args[0].startsWith('Session error:')) {
            return;
        }
        return originalConsoleError.apply(console, args);
    };
}
const Utils_1 = require("../Utils");
const WABinary_1 = require("../WABinary");
const sender_key_name_1 = require("./Group/sender-key-name");
const sender_key_record_1 = require("./Group/sender-key-record");
const Group_1 = require("./Group");
function makeLibSignalRepository(auth, logger, pnToLIDFunc) {
    const lidMapping_1 = require("./lid-mapping");
    const lidMapping = new lidMapping_1.LIDMappingStore(auth.keys, logger, pnToLIDFunc);
    const storage = signalStorage(auth, lidMapping);
    return {
        decryptGroupMessage({ group, authorJid, msg }) {
            const senderName = jidToSignalSenderKeyName(group, authorJid);
            const cipher = new Group_1.GroupCipher(storage, senderName);
            return cipher.decrypt(msg);
        },
        async processSenderKeyDistributionMessage({ item, authorJid }) {
            const builder = new Group_1.GroupSessionBuilder(storage);
            if (!item.groupId) {
                throw new Error('Group ID is required for sender key distribution message');
            }
            const senderName = jidToSignalSenderKeyName(item.groupId, authorJid);
            const senderMsg = new Group_1.SenderKeyDistributionMessage(null, null, null, null, item.axolotlSenderKeyDistributionMessage);
            const senderNameStr = senderName.toString();
            const { [senderNameStr]: senderKey } = await auth.keys.get('sender-key', [senderNameStr]);
            if (!senderKey) {
                await storage.storeSenderKey(senderName, new sender_key_record_1.SenderKeyRecord());
            }
            await builder.process(senderName, senderMsg);
        },
        async decryptMessage({ jid, type, ciphertext }) {
            const addr = jidToSignalProtocolAddress(jid);
            const session = new libsignal.SessionCipher(storage, addr);
            let result;
            switch (type) {
                case 'pkmsg':
                    result = await session.decryptPreKeyWhisperMessage(ciphertext);
                    break;
                case 'msg':
                    result = await session.decryptWhisperMessage(ciphertext);
                    break;
                default:
                    throw new Error(`Unknown message type: ${type}`);
            }
            return result;
        },
        async encryptMessage({ jid, data }) {
            const addr = jidToSignalProtocolAddress(jid);
            const cipher = new libsignal.SessionCipher(storage, addr);
            const { type: sigType, body } = await cipher.encrypt(data);
            const type = sigType === 3 ? 'pkmsg' : 'msg';
            return { type, ciphertext: Buffer.from(body, 'binary') };
        },
        async encryptGroupMessage({ group, meId, data }) {
            const senderName = jidToSignalSenderKeyName(group, meId);
            const builder = new Group_1.GroupSessionBuilder(storage);
            const senderNameStr = senderName.toString();
            const { [senderNameStr]: senderKey } = await auth.keys.get('sender-key', [senderNameStr]);
            if (!senderKey) {
                await storage.storeSenderKey(senderName, new sender_key_record_1.SenderKeyRecord());
            }
            const senderKeyDistributionMessage = await builder.create(senderName);
            const session = new Group_1.GroupCipher(storage, senderName);
            const ciphertext = await session.encrypt(data);
            return {
                ciphertext,
                senderKeyDistributionMessage: senderKeyDistributionMessage.serialize()
            };
        },
        async injectE2ESession({ jid, session }) {
            const cipher = new libsignal.SessionBuilder(storage, jidToSignalProtocolAddress(jid));
            await cipher.initOutgoing(session);
        },
        jidToSignalProtocolAddress(jid) {
            return jidToSignalProtocolAddress(jid).toString();
        },
        lidMapping,
        async migrateSession(fromJid, toJid) {
            const fromDecoded = (0, WABinary_1.jidDecode)(fromJid);
            const toDecoded = (0, WABinary_1.jidDecode)(toJid);
            if (!fromDecoded?.user || !toDecoded?.user) return { migrated: 0, skipped: 0, total: 0 };
            const isPn = (0, WABinary_1.isJidUser)(fromJid) || (0, WABinary_1.isHostedPnUser)(fromJid);
            const isLid = (0, WABinary_1.isLidUser)(toJid) || (0, WABinary_1.isHostedLidUser)(toJid);
            if (!isPn || !isLid) return { migrated: 0, skipped: 0, total: 0 };

            const pnUser = fromDecoded.user;
            const fromDevice = String(fromDecoded.device || 0);
            let devices = [];
            try {
                const stored = await auth.keys.get('device-list', [pnUser]);
                if (Array.isArray(stored?.[pnUser])) devices = stored[pnUser].map(String);
            } catch (error) {
                logger?.debug?.({ error, pnUser }, 'could not read device list during PN-LID session migration');
            }
            if (!devices.includes(fromDevice)) devices.push(fromDevice);

            const migrationJids = [];
            for (const deviceStr of new Set(devices)) {
                const device = Number(deviceStr);
                if (!Number.isFinite(device)) continue;
                const pnJid = device === 99
                    ? `${pnUser}:99@hosted`
                    : device === 0 ? `${pnUser}@s.whatsapp.net` : `${pnUser}:${device}@s.whatsapp.net`;
                migrationJids.push({ pnJid, lidJid: (0, WABinary_1.transferDevice)(pnJid, toJid) });
            }
            const fromAddresses = migrationJids.map(({ pnJid }) => jidToSignalProtocolAddress(pnJid).toString());
            const pnSessions = await auth.keys.get('session', fromAddresses);
            const updates = {};
            let migrated = 0;
            for (const { pnJid, lidJid } of migrationJids) {
                const pnAddress = jidToSignalProtocolAddress(pnJid).toString();
                const lidAddress = jidToSignalProtocolAddress(lidJid).toString();
                const sessionData = pnSessions?.[pnAddress];
                if (!sessionData) continue;
                try {
                    const sessionRecord = libsignal.SessionRecord.deserialize(sessionData);
                    if (!sessionRecord.haveOpenSession()) continue;
                    updates[lidAddress] = sessionRecord.serialize();
                    updates[pnAddress] = null;
                    migrated++;
                } catch (error) {
                    logger?.debug?.({ error, pnJid, lidJid }, 'skipping invalid session during PN-LID migration');
                }
            }
            if (Object.keys(updates).length) {
                await auth.keys.set({ session: updates });
            }
            logger?.debug?.({ fromJid, toJid, migrated, total: migrationJids.length }, 'completed PN-LID session migration');
            return { migrated, skipped: migrationJids.length - migrated, total: migrationJids.length };
        }
    };
}
const jidToSignalProtocolAddress = (jid) => {
    const decoded = (0, WABinary_1.jidDecode)(jid);
    if (!decoded || !decoded.user) {
        throw new Error(`Invalid JID for Signal Protocol: ${jid}`);
    }
    // Keep PN and LID Signal addresses distinct. The suffix mirrors Baileys' WAJIDDomains values.
    const domainType = decoded.domainType || 0;
    const signalUser = domainType !== WABinary_1.WAJIDDomains.WHATSAPP ? `${decoded.user}_${domainType}` : decoded.user;
    return new libsignal.ProtocolAddress(signalUser, decoded.device || 0);
};
const jidToSignalSenderKeyName = (group, user) => {
    // Preserve the existing sender-key namespace for groups; this patch targets 1:1 Signal sessions.
    const decoded = (0, WABinary_1.jidDecode)(user);
    return new sender_key_name_1.SenderKeyName(group, new libsignal.ProtocolAddress(decoded.user, decoded.device || 0));
};
function signalStorage({ creds, keys }, lidMapping) {
    const resolveLIDSignalAddress = async (id) => {
        if (!lidMapping || typeof id !== 'string' || !id.includes('.')) return id;
        const [signalUser, device = '0'] = id.split('.');
        const suffix = signalUser.match(/_(\d+)$/);
        const domainType = suffix ? Number(suffix[1]) : WABinary_1.WAJIDDomains.WHATSAPP;
        // LID sessions already use their canonical namespace. Only resolve PN addresses.
        if (domainType === WABinary_1.WAJIDDomains.LID || domainType === WABinary_1.WAJIDDomains.HOSTED_LID) return id;
        const user = suffix ? signalUser.slice(0, -suffix[0].length) : signalUser;
        if (!user) return id;
        const server = domainType === WABinary_1.WAJIDDomains.HOSTED ? 'hosted' : 's.whatsapp.net';
        const pnJid = `${user}${device !== '0' ? `:${device}` : ''}@${server}`;
        const lidJid = await lidMapping.getLIDForPN(pnJid);
        if (!lidJid) return id;
        return jidToSignalProtocolAddress(lidJid).toString();
    };
    return {
        loadSession: async (id) => {
            const resolvedId = await resolveLIDSignalAddress(id);
            const { [resolvedId]: sess } = await keys.get('session', [resolvedId]);
            if (sess) {
                return libsignal.SessionRecord.deserialize(sess);
            }
        },
        storeSession: async (id, session) => {
            const resolvedId = await resolveLIDSignalAddress(id);
            await keys.set({ session: { [resolvedId]: session.serialize() } });
        },
        isTrustedIdentity: () => {
            return true;
        },
        loadIdentityKey: async (id) => {
            const resolvedId = await resolveLIDSignalAddress(id);
            const { [resolvedId]: key } = await keys.get('identity-key', [resolvedId]);
            return key || undefined;
        },
        saveIdentity: async (id, identityKey) => {
            const resolvedId = await resolveLIDSignalAddress(id);
            const { [resolvedId]: existingKey } = await keys.get('identity-key', [resolvedId]);
            const matches = existingKey && existingKey.length === identityKey.length && existingKey.every((byte, i) => byte === identityKey[i]);
            if (existingKey && !matches) {
                await keys.set({ session: { [resolvedId]: null }, 'identity-key': { [resolvedId]: identityKey } });
                return true;
            }
            if (!existingKey) {
                await keys.set({ 'identity-key': { [resolvedId]: identityKey } });
                return true;
            }
            return false;
        },
        loadPreKey: async (id) => {
            const keyId = id.toString();
            const { [keyId]: key } = await keys.get('pre-key', [keyId]);
            if (key) {
                return {
                    privKey: Buffer.from(key.private),
                    pubKey: Buffer.from(key.public)
                };
            }
        },
        removePreKey: (id) => keys.set({ 'pre-key': { [id]: null } }),
        loadSignedPreKey: () => {
            const key = creds.signedPreKey;
            return {
                privKey: Buffer.from(key.keyPair.private),
                pubKey: Buffer.from(key.keyPair.public)
            };
        },
        loadSenderKey: async (senderKeyName) => {
            const keyId = senderKeyName.toString();
            const { [keyId]: key } = await keys.get('sender-key', [keyId]);
            if (key) {
                return sender_key_record_1.SenderKeyRecord.deserialize(key);
            }
            return new sender_key_record_1.SenderKeyRecord();
        },
        storeSenderKey: async (senderKeyName, key) => {
            const keyId = senderKeyName.toString();
            const serialized = JSON.stringify(key.serialize());
            await keys.set({ 'sender-key': { [keyId]: Buffer.from(serialized, 'utf-8') } });
        },
        getOurRegistrationId: () => creds.registrationId,
        getOurIdentity: () => {
            const { signedIdentityKey } = creds;
            return {
                privKey: Buffer.from(signedIdentityKey.private),
                pubKey: (0, Utils_1.generateSignalPubKey)(signedIdentityKey.public)
            };
        }
    };
}
