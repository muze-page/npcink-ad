import { Card, CardBody } from '@wordpress/components';

const shortcodeExamples = [
    '[magick_ad slot="sidebar-top"]',
    '[magick_ad id="ad_123456"]',
    '[magick_ad slot="post-inline-1" class="my-ad"]',
];

const templateExample =
    "<?php if (function_exists('magick_ad_the')) : ?>\n" +
    "  <?php magick_ad_the('sidebar-top'); ?>\n" +
    "<?php endif; ?>";

const InsertHelpPanel = () => {
    return (
        <Card>
            <CardBody>
                <div className="magick-ad-field__label">插入入口</div>
                <p>以下是推荐的三种插入方式，适配不同编辑环境与主题需求。</p>

                <hr />

                <h3>区块（Block）</h3>
                <p>
                    现代 WP 首选（Gutenberg / FSE），可在编辑器中直接插入
                    “Magick AD” 区块。
                </p>
                <ol>
                    <li>在区块编辑器中添加 “Magick AD” 区块。</li>
                    <li>在区块设置中选择广告位 Slot。</li>
                    <li>预览可实时渲染，前台根据投放规则显示。</li>
                </ol>

                <h3>短代码（Shortcode）</h3>
                <p>兼容经典编辑器/复制粘贴场景，适合内容中快速插入。</p>
                <pre>
                    <code>{shortcodeExamples.join('\n')}</code>
                </pre>

                <h3>主题模板函数（Template Tag / PHP API）</h3>
                <p>给主题开发者或模板文件使用，适合放在任意位置。</p>
                <pre>
                    <code>{templateExample}</code>
                </pre>

                <h4>Slot 命名建议</h4>
                <ul>
                    <li>推荐使用小写字母、数字与短横线。</li>
                    <li>保持唯一性，便于在区块/短代码/模板函数中稳定引用。</li>
                </ul>
            </CardBody>
        </Card>
    );
};

export default InsertHelpPanel;
