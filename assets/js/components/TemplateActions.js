import { Button } from '@wordpress/components';

const TemplateActions = ({ onOpen, onSave, variant = 'toolbar' }) => {
    return (
        <div
            className={`magick-ad-template-actions ${
                variant ? `is-${variant}` : ''
            }`}
        >
            <Button variant="secondary" onClick={onOpen}>
                模板库
            </Button>
            <Button variant="tertiary" onClick={onSave}>
                存为模板
            </Button>
        </div>
    );
};

export default TemplateActions;
