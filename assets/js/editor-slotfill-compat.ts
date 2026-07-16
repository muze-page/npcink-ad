export function selectEditorSlotFill< SlotFill >(
	current: SlotFill | undefined,
	legacy: SlotFill
): SlotFill {
	return current ?? legacy;
}
