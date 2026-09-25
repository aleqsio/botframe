import { DesignDocument } from "./document";

const MAGIC = new TextEncoder().encode("botframe");
const VERSION = 1;
const HEADER_LENGTH = MAGIC.length + 1;

function hasHeader(bytes: Uint8Array): boolean {
	return (
		bytes.length > HEADER_LENGTH &&
		MAGIC.every((byte, index) => bytes[index] === byte) &&
		bytes[MAGIC.length] === VERSION
	);
}

export function fileBytes(doc: DesignDocument): Uint8Array {
	const snapshot = doc.snapshot();
	const bytes = new Uint8Array(HEADER_LENGTH + snapshot.length);
	bytes.set(MAGIC);
	bytes[MAGIC.length] = VERSION;
	bytes.set(snapshot, HEADER_LENGTH);
	return bytes;
}

export function readFile(bytes: Uint8Array): DesignDocument | null {
	if (!hasHeader(bytes)) {
		return null;
	}
	try {
		return DesignDocument.open(bytes.subarray(HEADER_LENGTH));
	} catch {
		return null;
	}
}
