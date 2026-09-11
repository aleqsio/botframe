export const WRITE_CLIPBOARD = "clipboard:write";
export const READ_CLIPBOARD_LAYERS = "clipboard:read-layers";
export const HAS_CLIPBOARD_LAYERS = "clipboard:has-layers";

export const LAYERS_FLAVOR = "web application/botframe-layers";
export const HTML_FLAVOR = "text/html";
export const TEXT_FLAVOR = "text/plain";

export interface ClipboardWrite {
	html: string;
	layers: string | null;
}
