import { useEffect, useState } from '@wordpress/element';
import {
    BlockEditorProvider,
    BlockList,
    BlockListAppender,
    BlockTools,
    ObserveTyping,
    WritingFlow,
} from '@wordpress/block-editor';
import { createBlock, parse, serialize } from '@wordpress/blocks';
import { registerCoreBlocks } from '@wordpress/block-library';
import { Button } from '@wordpress/components';

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

    const handleAddDefaultBlock = () => {
        const nextBlocks = [
            createBlock('core/paragraph', {
                placeholder: '输入内容…',
            }),
        ];
        setBlocks(nextBlocks);
        onChange(serialize(nextBlocks));
    };

    return (
        <div className="magick-ad-block-editor editor-styles-wrapper">
            {blocks.length === 0 && (
                <div className="magick-ad-block-editor__empty">
                    <p>点击开始可视化设计，或添加一个段落</p>
                    <Button
                        variant="secondary"
                        onClick={handleAddDefaultBlock}
                    >
                        添加段落
                    </Button>
                </div>
            )}
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
