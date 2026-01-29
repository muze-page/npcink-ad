import { Button, CheckboxControl, Modal, Notice, TabPanel } from '@wordpress/components';

const TemplateLibraryModal = ({
    isOpen,
    type,
    templates,
    selected,
    onToggleSelect,
    onApply,
    onImport,
    onExport,
    onClose,
}) => {
    if (!isOpen) {
        return null;
    }

    const systemTemplates = templates.filter((item) => item.source === 'preset');
    const userTemplates = templates.filter((item) => item.source === 'user');

    return (
        <Modal title="模板库" onRequestClose={onClose} size="large">
            <div className="magick-ad-template-toolbar">
                <div className="magick-ad-template-toolbar__actions">
                    <Button variant="secondary" onClick={onImport}>
                        导入模板
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={onExport}
                        disabled={selected.length === 0}
                    >
                        导出选中
                    </Button>
                </div>
            </div>

            <TabPanel
                className="magick-ad-template-tabs"
                tabs={[
                    { name: 'preset', title: '系统预设' },
                    { name: 'user', title: '我的模板' },
                ]}
            >
                {(tab) => {
                    const list =
                        tab.name === 'preset'
                            ? systemTemplates
                            : userTemplates;
                    if (list.length === 0) {
                        return (
                            <Notice status="info" isDismissible={false}>
                                暂无模板。
                            </Notice>
                        );
                    }
                    return (
                        <div className="magick-ad-template-grid">
                            {list.map((template) => (
                                <div
                                    key={template.id}
                                    className="magick-ad-template-card"
                                >
                                    <div className="magick-ad-template-card__body">
                                        <h4>{template.name || template.title}</h4>
                                        <p>{template.description || ''}</p>
                                    </div>
                                    <div className="magick-ad-template-card__actions">
                                        <Button
                                            variant="primary"
                                            onClick={() => onApply(template)}
                                        >
                                            应用
                                        </Button>
                                    </div>
                                    <CheckboxControl
                                        className="magick-ad-template-card__check"
                                        label="导出"
                                        checked={selected.includes(template.id)}
                                        onChange={() =>
                                            onToggleSelect(template.id)
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    );
                }}
            </TabPanel>
        </Modal>
    );
};

export default TemplateLibraryModal;
