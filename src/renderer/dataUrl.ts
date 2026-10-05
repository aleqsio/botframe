export function dataUrlBytes(url: string): Uint8Array<ArrayBuffer> {
	const [, base64 = ""] = url.split(",");
	return Uint8Array.from(atob(base64), (character) => character.codePointAt(0) ?? 0);
}
