import { useEffect, useState } from '@wordpress/element';
import {
    BlockEditorProvider,
    BlockList,
    BlockListAppender,
    BlockTools,
    ObserveTyping,
    WritingFlow,
} from '@wordpress/block-editor';
import { parse, serialize } from '@wordpress/blocks';
import { registerCoreBlocks } from '@wordpress/block-library';

let coreBlocksRegistered = false;
const ensureCoreBlocks = () => {
    if (!coreBlocksRegistered) {
        registerCoreBlocks();
        coreBlocksRegistered = true;
    }
};

const BlockEditor = ({ value, onChange }) => {
    const [blocks, setBlocks] = useState(() => parse(value || ''));

    useEffect(() => {
        ensureCoreBlocks();
    }, []);

    useEffect(() => {
        setBlocks(parse(value || ''));
    }, [value]);

    return (
        <div className="magick-ad-block-editor editor-styles-wrapper">
            <BlockEditorProvider
                value={blocks}
                onChange={(nextBlocks) => {
                    setBlocks(nextBlocks);
                    onChange(serialize(nextBlocks));
                }}
                settings={{
                    hasFixedToolbar: true,
                    allowWideBlocks: false,
                }}
            >
                <BlockTools>
                    <WritingFlow>
                        <ObserveTyping>
                            <BlockList renderAppender={BlockListAppender} />
                        </ObserveTyping>
                    </WritingFlow>
                </BlockTools>
            </BlockEditorProvider>
        </div>
    );
};

export default BlockEditor;
