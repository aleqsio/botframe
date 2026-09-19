export interface Modifiers {
	shift: boolean;
	alt: boolean;
	control: boolean;
}

export const NO_MODIFIERS: Modifiers = { shift: false, alt: false, control: false };

export function modifiersOf(event: {
	altKey: boolean;
	shiftKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
}): Modifiers {
	return { shift: event.shiftKey, alt: event.altKey, control: event.ctrlKey || event.metaKey };
}
