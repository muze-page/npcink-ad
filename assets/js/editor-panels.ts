import {
	PluginDocumentSettingPanel as LegacyPluginDocumentSettingPanel,
	PluginPrePublishPanel as LegacyPluginPrePublishPanel,
} from '@wordpress/edit-post';
import {
	PluginDocumentSettingPanel as CurrentPluginDocumentSettingPanel,
	PluginPrePublishPanel as CurrentPluginPrePublishPanel,
} from '@wordpress/editor';

import { selectEditorSlotFill } from './editor-slotfill-compat';

export const PluginDocumentSettingPanel = selectEditorSlotFill(
	CurrentPluginDocumentSettingPanel,
	LegacyPluginDocumentSettingPanel
);

export const PluginPrePublishPanel = selectEditorSlotFill(
	CurrentPluginPrePublishPanel,
	LegacyPluginPrePublishPanel
);
