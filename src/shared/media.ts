export const FETCH_MEDIA = "media:fetch";

export const MAX_MEDIA_BYTES = 256 * 1024 * 1024;

export interface FetchedMedia {
	type: string;
	bytes: Uint8Array<ArrayBuffer>;
}
