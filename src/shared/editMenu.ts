export const SET_EDIT_MENU = "edit-menu:set";
export const EDIT_COMMAND = "edit-menu:command";

export interface EditMenuItem {
	id: string;
	label: string;
	accelerator: string;
	enabled: boolean;
	separatorBefore?: boolean;
	submenu?: readonly EditMenuItem[];
}
