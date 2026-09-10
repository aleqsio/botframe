export interface Modifiers {
	shift: boolean;
	alt: boolean;
}

export const NO_MODIFIERS: Modifiers = { shift: false, alt: false };

export function modifiersOf(event: { altKey: boolean; shiftKey: boolean }): Modifiers {
	return { shift: event.shiftKey, alt: event.altKey };
}
