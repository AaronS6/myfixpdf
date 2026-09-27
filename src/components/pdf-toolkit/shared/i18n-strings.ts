"use client";

export type Lang = "en" | "zh";

export type StringKey =
  | "brand.name"
  | "brand.tagline"
  | "nav.compress"
  | "nav.convert"
  | "nav.organize"
  | "nav.edit"
  | "nav.home"
  | "nav.getStarted"
  | "nav.madeBy"
  | "hero.badge"
  | "hero.title1"
  | "hero.titleAccent"
  | "hero.subtitle"
  | "hero.dropzone.title"
  | "hero.dropzone.subtitle"
  | "hero.dropzone.cta"
  | "hero.features.instant"
  | "hero.features.private"
  | "hero.features.chain"
  | "hero.allTools"
  | "hero.allTools.subtitle"
  | "hero.why.title.private"
  | "hero.why.text.private"
  | "hero.why.title.real"
  | "hero.why.text.real"
  | "hero.why.title.chain"
  | "hero.why.text.chain"
  | "tool.back"
  | "tool.chooseFiles"
  | "tool.loading"
  | "tool.clearAll"
  | "tool.filesReady"
  | "tool.addMore"
  | "tool.dropHere"
  | "tool.reminder"
  | "result.download"
  | "result.compare"
  | "result.compare.exit"
  | "result.oversize.warning"
  | "result.compressMore"
  | "result.continueWorking"
  | "result.signAnnotate"
  | "result.addDescription"
  | "result.editPages"
  | "result.startOver"
  | "result.mergeMore"
  | "result.splitThis"
  | "result.didYouKnow"
  | "result.didYouKnow.body"
  | "result.saved"
  | "result.noResult"
  | "result.backHome"
  | "result.expand"
  | "footer.shortcut"
  | "footer.madeWith"
  | "footer.builtClientSide"
  | "footer.product"
  | "footer.tools"
  | "common.page"
  | "common.pageOf"
  | "common.apply"
  | "common.cancel"
  | "common.clear"
  | "common.done"
  | "common.remove"
  | "common.include"
  | "common.exclude";

type Dict = Record<StringKey, string>;

const en: Dict = {
  "brand.name": "myfixpdf",
  "brand.tagline": "Every PDF tool you need, in one place.",
  "nav.compress": "Compress",
  "nav.convert": "Convert",
  "nav.organize": "Organize",
  "nav.edit": "Edit & Sign",
  "nav.home": "Home",
  "nav.getStarted": "Get Started",
  "nav.madeBy": "by Aaron Shan",
  "hero.badge": "100% in your browser · Files never leave your device",
  "hero.title1": "Every PDF tool you need,",
  "hero.titleAccent": "in one place.",
  "hero.subtitle":
    "Compress, convert, merge, split, edit & sign — all in your browser. Real processing, real results, no uploads.",
  "hero.dropzone.title": "Drop files here or click to browse",
  "hero.dropzone.subtitle": "PDFs, JPGs, PNGs, DOCX — multiple files supported",
  "hero.dropzone.cta": "Choose Files",
  "hero.features.instant": "Instant processing",
  "hero.features.private": "Private & secure",
  "hero.features.chain": "Chain tools freely",
  "hero.allTools": "All tools",
  "hero.allTools.subtitle": "Pick a tool to start, or drop files above — we'll route you automatically.",
  "hero.why.title.private": "Truly private",
  "hero.why.text.private": "Every byte is processed by your browser. Nothing is uploaded anywhere.",
  "hero.why.title.real": "Real results",
  "hero.why.text.real": "Real PDF libraries doing the work — no fake spinners, no placeholders.",
  "hero.why.title.chain": "Chain freely",
  "hero.why.text.chain": "Compress → merge → sign → split, all without ever pressing Download in between.",
  "tool.back": "Back to tools",
  "tool.chooseFiles": "Choose Files",
  "tool.loading": "Loading…",
  "tool.clearAll": "Clear all",
  "tool.filesReady": "ready",
  "tool.addMore": "Add more files",
  "tool.dropHere": "or drop files here",
  "tool.reminder":
    "Your files stay loaded until you remove them or start over — they'll follow you between tools.",
  "result.download": "Download",
  "result.compare": "Compare before/after",
  "result.compare.exit": "Exit compare",
  "result.oversize.warning": "This file is quite large. Consider compressing it further before sharing.",
  "result.compressMore": "Compress More",
  "result.continueWorking": "Continue working",
  "result.signAnnotate": "Sign / Annotate",
  "result.addDescription": "Add Description",
  "result.editPages": "Edit Pages",
  "result.startOver": "Start Over",
  "result.mergeMore": "Merge with another file",
  "result.splitThis": "Split this file",
  "result.didYouKnow": "Did you know?",
  "result.didYouKnow.body":
    "You can chain tools without downloading. The current file is held in your browser session until you press Download — feel free to compress again, sign, or merge it with another file.",
  "result.saved": "You saved",
  "result.noResult": "No result yet. Run a tool first.",
  "result.backHome": "Back to home",
  "result.expand": "Expand",
  "footer.shortcut": "Shortcuts",
  "footer.madeWith": "Made with",
  "footer.builtClientSide": "Built client-side — no uploads.",
  "footer.product": "Product",
  "footer.tools": "Tools",
  "common.page": "Page",
  "common.pageOf": "of",
  "common.apply": "Apply",
  "common.cancel": "Cancel",
  "common.clear": "Clear",
  "common.done": "Done",
  "common.remove": "Remove",
  "common.include": "Include",
  "common.exclude": "Exclude",
};

const zh: Dict = {
  "brand.name": "myfixpdf PDF 工具箱",
  "brand.tagline": "你需要的每一个 PDF 工具，一站式搞定。",
  "nav.compress": "压缩",
  "nav.convert": "转换",
  "nav.organize": "整理",
  "nav.edit": "编辑与签名",
  "nav.home": "首页",
  "nav.getStarted": "开始使用",
  "nav.madeBy": "Aaron Shan 出品",
  "hero.badge": "100% 在浏览器中处理 · 文件永不离开你的设备",
  "hero.title1": "你需要的每一个 PDF 工具，",
  "hero.titleAccent": "一站式搞定。",
  "hero.subtitle": "压缩、转换、合并、拆分、编辑与签名 — 全部在你的浏览器中完成。真实处理、真实结果、无需上传。",
  "hero.dropzone.title": "拖拽文件到此处，或点击浏览",
  "hero.dropzone.subtitle": "支持 PDF、JPG、PNG、DOCX — 可同时上传多个文件",
  "hero.dropzone.cta": "选择文件",
  "hero.features.instant": "即时处理",
  "hero.features.private": "私密安全",
  "hero.features.chain": "自由串联工具",
  "hero.allTools": "全部工具",
  "hero.allTools.subtitle": "选择一个工具开始，或在上方拖入文件 — 我们会自动为你跳转。",
  "hero.why.title.private": "真正私密",
  "hero.why.text.private": "每一字节都由你的浏览器处理，绝不上传到任何地方。",
  "hero.why.title.real": "真实结果",
  "hero.why.text.real": "由真实的 PDF 库执行处理 — 没有假进度条，没有占位符。",
  "hero.why.title.chain": "自由串联",
  "hero.why.text.chain": "压缩 → 合并 → 签名 → 拆分，无需在中间按下下载。",
  "tool.back": "返回工具列表",
  "tool.chooseFiles": "选择文件",
  "tool.loading": "加载中…",
  "tool.clearAll": "全部清除",
  "tool.filesReady": "已就绪",
  "tool.addMore": "添加更多文件",
  "tool.dropHere": "或拖拽文件到此处",
  "tool.reminder": "你的文件会一直保留，直到你移除它们或重新开始 — 它们会在工具之间跟随你。",
  "result.download": "下载",
  "result.compare": "对比前后效果",
  "result.compare.exit": "退出对比",
  "result.oversize.warning": "文件较大，建议在分享前进一步压缩。",
  "result.compressMore": "继续压缩",
  "result.continueWorking": "继续处理",
  "result.signAnnotate": "签名 / 标注",
  "result.addDescription": "添加描述",
  "result.editPages": "编辑页面",
  "result.startOver": "重新开始",
  "result.mergeMore": "与其他文件合并",
  "result.splitThis": "拆分此文件",
  "result.didYouKnow": "你知道吗？",
  "result.didYouKnow.body":
    "你可以在不下载的情况下串联多个工具。当前文件会一直保留在浏览器会话中，直到你按下下载 — 随意再次压缩、签名或与其他文件合并。",
  "result.saved": "你节省了",
  "result.noResult": "暂无结果，请先运行一个工具。",
  "result.backHome": "返回首页",
  "result.expand": "放大",
  "footer.shortcut": "快捷键",
  "footer.madeWith": "由",
  "footer.builtClientSide": "客户端构建 — 无需上传。",
  "footer.product": "产品",
  "footer.tools": "工具",
  "common.page": "第",
  "common.pageOf": "页 / 共",
  "common.apply": "应用",
  "common.cancel": "取消",
  "common.clear": "清除",
  "common.done": "完成",
  "common.remove": "移除",
  "common.include": "包含",
  "common.exclude": "排除",
};

export const DICTS: Record<Lang, Dict> = { en, zh };

/** Tool descriptions also need i18n — separate dictionary. */
export type ToolDescKey = "name" | "short" | "desc";

export const TOOL_NAMES: Record<Lang, Record<string, { name: string; short: string; desc: string }>> = {
  en: {
    "compress-pdf": { name: "PDF Compressor", short: "Compress", desc: "Shrink PDFs up to 75% — pick your quality vs size trade-off." },
    "compress-png": { name: "Image Compressor", short: "Compress", desc: "Make PNG and JPG files smaller — see the result instantly as you drag the slider." },
    "pdf-to-word": { name: "PDF to Word", short: "Convert", desc: "Turn a PDF into an editable Word document you can actually open and edit." },
    "word-to-pdf": { name: "Word to PDF", short: "Convert", desc: "Turn a Word document into a clean, shareable PDF." },
    "pdf-to-jpg": { name: "PDF to JPG", short: "Convert", desc: "Turn each page of a PDF into a JPG image — download one or all as a ZIP." },
    "convert-to-pdf": { name: "Convert to PDF", short: "Convert", desc: "Turn any image or document into a PDF — JPG, PNG, even another PDF." },
    "split-pdf": { name: "Split PDF", short: "Organize", desc: "Pick exactly which pages to keep — by checkbox or by typing page numbers." },
    "merge-pdf": { name: "Merge PDF", short: "Organize", desc: "Mix PDFs and images into one PDF. Choose which pages to include from each file." },
    "reorder-pdf": { name: "Reorder Pages", short: "Organize", desc: "Drag pages around to put them in any order you want." },
    "edit-pdf": { name: "Edit PDF", short: "Edit & Sign", desc: "Rotate one page (not all of them), delete, duplicate, draw, sign, add text." },
    "watermark-pdf": { name: "Watermark PDF", short: "Edit & Sign", desc: "Stamp a text or image watermark across every page." },
    "page-numbers": { name: "Page Numbers", short: "Edit & Sign", desc: "Add page numbers in 4 formats, in 4 positions — one click." },
    "extract-text": { name: "Extract Text", short: "Convert", desc: "Pull all the text out of a PDF into a plain text file." },
    "redact-pdf": { name: "Redact PDF", short: "Edit & Sign", desc: "Permanently black out sensitive text so it can never be recovered." },
    "rotate-pdf": { name: "Rotate PDF", short: "Organize", desc: "Fix sideways or upside-down pages — quick standalone tool." },
    "delete-pages": { name: "Delete Pages", short: "Organize", desc: "Remove pages you don't need — no need to open the full editor." },
    "crop-pdf": { name: "Crop PDF", short: "Organize", desc: "Trim margins and whitespace from your pages." },
    "edit-png": { name: "Edit Image", short: "Edit & Sign", desc: "Annotate PNG and JPG images — draw, add text, shapes, crop, rotate." },
    "translate-pdf": { name: "Translate PDF", short: "Convert", desc: "Translate text in a PDF or Word file to any language you want." },
  },
  zh: {
    "compress-pdf": { name: "PDF 压缩", short: "压缩", desc: "把 PDF 缩小到原来的 25% — 自由选择清晰度与大小。" },
    "compress-png": { name: "图片压缩", short: "压缩", desc: "让 PNG 和 JPG 文件更小 — 拖动滑块即时看到结果。" },
    "pdf-to-word": { name: "PDF 转 Word", short: "转换", desc: "把 PDF 转成可编辑的 Word 文档，能直接打开并修改。" },
    "word-to-pdf": { name: "Word 转 PDF", short: "转换", desc: "把 Word 文档转成清晰、易分享的 PDF。" },
    "pdf-to-jpg": { name: "PDF 转 JPG", short: "转换", desc: "把 PDF 的每一页都转成 JPG 图片 — 可单独下载或打包成 ZIP。" },
    "convert-to-pdf": { name: "转为 PDF", short: "转换", desc: "把任何图片或文档转成 PDF — 支持 JPG、PNG，甚至另一个 PDF。" },
    "split-pdf": { name: "拆分 PDF", short: "整理", desc: "精确选择要保留的页面 — 用复选框或输入页码。" },
    "merge-pdf": { name: "合并 PDF", short: "整理", desc: "把 PDF 和图片混搭成一个 PDF。可从每个文件中挑选要包含的页面。" },
    "reorder-pdf": { name: "重排页面", short: "整理", desc: "拖动页面调整顺序，随心所欲。" },
    "edit-pdf": { name: "编辑 PDF", short: "编辑与签名", desc: "只旋转当前页（不是全部）、删除、复制、绘制、签名、添加文字。" },
    "watermark-pdf": { name: "PDF 水印", short: "编辑与签名", desc: "在每一页盖上文字或图片水印。" },
    "page-numbers": { name: "页码", short: "编辑与签名", desc: "4 种格式、4 个位置 — 一键添加页码。" },
    "extract-text": { name: "提取文字", short: "转换", desc: "把 PDF 里的所有文字提取成一个纯文本文件。" },
    "redact-pdf": { name: "PDF 涂黑", short: "编辑与签名", desc: "永久涂黑敏感文字 — 永远无法恢复。" },
    "rotate-pdf": { name: "旋转 PDF", short: "整理", desc: "修复横躺或倒立的页面 — 快捷独立工具。" },
    "delete-pages": { name: "删除页面", short: "整理", desc: "移除不需要的页面 — 无需打开完整编辑器。" },
    "crop-pdf": { name: "裁剪 PDF", short: "整理", desc: "裁掉页面的边距与空白。" },
    "edit-png": { name: "图片编辑", short: "编辑与签名", desc: "标注 PNG 和 JPG 图片 — 绘制、加文字、加形状、裁剪、旋转。" },
    "translate-pdf": { name: "翻译 PDF", short: "转换", desc: "把 PDF 或 Word 中的文字翻译成任何语言。" },
  },
};
