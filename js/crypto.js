
export async function getSalt(roomName) {
        const enc = new TextEncoder();
        const data = enc.encode(roomName + 'EphemChatSalt');
        const hash = await crypto.subtle.digest('SHA-256', data);
        return new Uint8Array(hash);
}

export async function deriveKey(password, salt) {
    const normalized = password.normalize('NFKC');
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw', enc.encode(normalized), {name: 'PBKDF2'}, false, ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 600000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
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

