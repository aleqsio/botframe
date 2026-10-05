const CHUNK = 0x80_00;

export function base64Of(bytes: Uint8Array): string {
	let text = "";
	for (let start = 0; start < bytes.length; start += CHUNK) {
		text += String.fromCodePoint(...bytes.subarray(start, start + CHUNK));
	}
	return btoa(text);
}
