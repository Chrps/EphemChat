export async function getSalt(name) {
        const enc = new TextEncoder();
        const data = enc.encode(name + 'EphemChatSalt');
        const hash = await crypto.subtle.digest('SHA-256', data);
        return new Uint8Array(hash);
}

export async function hashPassword(password, salt) {
    const normalized = password.normalize('NFKC');
    return await argon2.hash({
        pass: normalized,
        salt: salt,
        type: argon2.ArgonType.Argon2id,
        hashLen: 32,
        time: 3,
        mem: 1 << 16,
        parallelism: 4
    });
}

export async function deriveKey(password, salt) {
    const hash = await hashPassword(password, salt);
    return window.crypto.subtle.importKey(
        'raw',
        hash.hash,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptMessage(key, plaintext) {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, key, enc.encode(plaintext)
    );
    return { iv: Array.from(iv), data: Array.from(new Uint8Array(ciphertext)) };
}

export async function decryptMessage(key, { iv, data }) {
    const dec = new TextDecoder();
    const plaintext = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) }, key, new Uint8Array(data)
    );
    return dec.decode(plaintext);
}

export async function getId(name, password) {
    const salt = await getSalt(name);
    const hash = await hashPassword(password, salt);
    const hashHex = Array.from(hash.hash).map(b => b.toString(16).padStart(2, '0')).join('');
    const toHash = `${name}-${hashHex}`;
    const enc = new TextEncoder();
    const shaBuffer = await crypto.subtle.digest('SHA-256', enc.encode(toHash));
    const shaHex = Array.from(new Uint8Array(shaBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return shaHex;
}