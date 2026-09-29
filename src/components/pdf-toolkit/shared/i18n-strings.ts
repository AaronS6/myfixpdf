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
  | "common.exclude"
  | "common.fit"
  | "common.openTool"
  | "common.loading"
  | "common.penColor"
  | "common.stroke"
  | "common.inkColor"
  | "common.drawn"
  | "common.typed"
  | "tool.compress.cta"
  | "tool.compress.chooseLevel"
  | "tool.compress.info"
  | "tool.compress.alreadyOptimized"
  | "tool.compress.batchWarning"
  | "tool.rotate.saveCta"
  | "tool.rotate.quickRotate"
  | "tool.rotate.rotateAllCw"
  | "tool.rotate.rotateAllCcw"
  | "tool.rotate.undo"
  | "tool.rotate.empty"
  | "tool.rotate.info"
  | "tool.rotate.loadingPages"
  | "tool.rotate.undoEmpty"
  | "tool.watermark.cta"
  | "tool.watermark.textMode"
  | "tool.watermark.imageMode"
  | "tool.watermark.watermarkText"
  | "tool.watermark.fontSize"
  | "tool.watermark.rotation"
  | "tool.watermark.imageScale"
  | "tool.watermark.opacity"
  | "tool.watermark.color"
  | "tool.watermark.position"
  | "tool.watermark.applyTo"
  | "tool.watermark.preview"
  | "tool.watermark.empty"
  | "tool.watermark.info"
  | "tool.watermark.imageLoaded"
  | "tool.watermark.uploadImage"
  | "tool.pageNumbers.cta"
  | "tool.pageNumbers.format"
  | "tool.pageNumbers.position"
  | "tool.pageNumbers.fontSize"
  | "tool.pageNumbers.startFrom"
  | "tool.pageNumbers.empty"
  | "tool.pageNumbers.info"
  | "tool.pageNumbers.previewLabel"
  | "tool.pdfToPng.renderScale"
  | "tool.pdfToPng.scaleHint"
  | "tool.pdfToPng.selectPages"
  | "tool.pdfToPng.selectPagesHint"
  | "tool.pdfToPng.info"
  | "tool.pdfToPng.empty"
  | "result.noPreview"
  | "result.downloadAllZip"
  | "result.rotate"
  | "result.editImage"
  | "result.addToMerge"
  | "result.addToConvertPdf"
  | "result.downloadStarted"
  | "result.zipDownloaded"
  | "result.compare.before"
  | "result.compare.after"
  | "result.loading"
  | "result.oversize.body"
  | "result.signatureReady"
  | "result.signatureApplied"
  | "result.applySignature"
  | "result.removeSignature"
  | "result.onPage"
  | "progress.working"
  | "progress.takeMoment"
  | "modal.signature.title"
  | "modal.signature.draw"
  | "modal.signature.type"
  | "modal.signature.placeholder"
  | "modal.signature.yourName"
  | "modal.signature.apply"
  | "modal.signature.errors.emptyDraw"
  | "modal.signature.errors.emptyType"
  | "modal.description.title"
  | "modal.description.placeholder"
  | "modal.description.metadata"
  | "modal.description.metadataDesc"
  | "modal.description.visible"
  | "modal.description.visibleDesc"
  | "modal.description.info"
  | "modal.description.apply"
  | "toast.addedFiles"
  | "toast.filesLoaded"
  | "toast.encryptedPdf"
  | "toast.readPdfError"
  | "toast.rotatedAll"
  | "toast.rotatedPage"
  | "toast.undone"
  | "toast.rotatedSaved"
  | "toast.watermarkApplied"
  | "toast.pageNumbersAdded"
  | "toast.compressed"
  | "toast.compressedMinimal"
  | "toast.exportedPng"
  | "toast.exportedJpg"
  | "toast.pdfAddedPickTool";

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
    "Compress, convert, merge, split, edit & sign, all in your browser. Real processing, real results, no uploads.",
  "hero.dropzone.title": "Drop files here or click to browse",
  "hero.dropzone.subtitle": "PDFs, JPGs, PNGs, DOCX, multiple files supported",
  "hero.dropzone.cta": "Choose Files",
  "hero.features.instant": "Instant processing",
  "hero.features.private": "Private & secure",
  "hero.features.chain": "Chain tools freely",
  "hero.allTools": "All tools",
  "hero.allTools.subtitle": "Pick a tool to start, or drop files above, we'll route you automatically.",
  "hero.why.title.private": "Truly private",
  "hero.why.text.private": "Every byte is processed by your browser. Nothing is uploaded anywhere.",
  "hero.why.title.real": "Real results",
  "hero.why.text.real": "Real PDF libraries doing the work, no fake spinners, no placeholders.",
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
    "Your files stay loaded until you remove them or start over, they'll follow you between tools.",
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
    "You can chain tools without downloading. The current file is held in your browser session until you press Download, feel free to compress again, sign, or merge it with another file.",
  "result.saved": "You saved",
  "result.noResult": "No result yet. Run a tool first.",
  "result.backHome": "Back to home",
  "result.expand": "Expand",
  "footer.shortcut": "Shortcuts",
  "footer.madeWith": "Made with",
  "footer.builtClientSide": "Built client-side, no uploads.",
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
  "common.fit": "Fit",
  "common.openTool": "Open tool",
  "common.loading": "Loading…",
  "common.penColor": "Pen color:",
  "common.stroke": "Stroke:",
  "common.inkColor": "Ink color:",
  "common.drawn": "Drawn",
  "common.typed": "Typed",
  "tool.compress.cta": "Compress PDF",
  "tool.compress.chooseLevel": "Choose a compression level",
  "tool.compress.info": "Pick a quality level, smaller files reduce quality slightly, larger files keep it crisp.",
  "tool.compress.alreadyOptimized": "This PDF is already well-optimized. Savings were minimal.",
  "tool.compress.batchWarning": "Batch mode: the first included file will be compressed first. After compressing it, run again for the next file from the result screen.",
  "tool.rotate.saveCta": "Save Rotated PDF",
  "tool.rotate.quickRotate": "Quick rotate",
  "tool.rotate.rotateAllCw": "Rotate all 90° CW",
  "tool.rotate.rotateAllCcw": "Rotate all 90° CCW",
  "tool.rotate.undo": "Undo",
  "tool.rotate.empty": "Drop a PDF above to start rotating pages.",
  "tool.rotate.info": "Per-page rotation only touches the page you click, other pages stay exactly as they are. The toolbar buttons rotate every page in one pass. Live preview reflects the current state of your PDF.",
  "tool.rotate.loadingPages": "Loading pages…",
  "tool.rotate.undoEmpty": "Nothing to undo.",
  "tool.watermark.cta": "Apply Watermark",
  "tool.watermark.textMode": "Text watermark",
  "tool.watermark.imageMode": "Image watermark",
  "tool.watermark.watermarkText": "Watermark text",
  "tool.watermark.fontSize": "Font size",
  "tool.watermark.rotation": "Rotation",
  "tool.watermark.imageScale": "Image scale",
  "tool.watermark.opacity": "Opacity",
  "tool.watermark.color": "Color",
  "tool.watermark.position": "Position",
  "tool.watermark.applyTo": "Apply to",
  "tool.watermark.preview": "Preview",
  "tool.watermark.empty": "Drop a PDF above to add a watermark.",
  "tool.watermark.info": "Live preview is a mockup. The actual watermark will be baked into your PDF with exact coordinates using pdf-lib.",
  "tool.watermark.imageLoaded": "Image loaded, click to replace",
  "tool.watermark.uploadImage": "Upload PNG or JPG",
  "tool.pageNumbers.cta": "Add Page Numbers",
  "tool.pageNumbers.format": "Format",
  "tool.pageNumbers.position": "Position",
  "tool.pageNumbers.fontSize": "Font size",
  "tool.pageNumbers.startFrom": "Start from",
  "tool.pageNumbers.empty": "Drop a PDF above to add page numbers.",
  "tool.pageNumbers.info": "Page numbers are baked into the PDF using pdf-lib's drawText with the Helvetica font.",
  "tool.pageNumbers.previewLabel": "Preview (page 2 of 5)",
  "tool.pdfToPng.renderScale": "Render scale",
  "tool.pdfToPng.scaleHint": "Higher = sharper but larger files.",
  "tool.pdfToPng.selectPages": "Select pages (optional)",
  "tool.pdfToPng.selectPagesHint": "Leave empty to export every page. Check the boxes to export only specific pages.",
  "tool.pdfToPng.info": "Every selected page becomes a PNG. The result screen shows a gallery, download them one-by-one or all as a ZIP.",
  "tool.pdfToPng.empty": "Drop a PDF above to pick which pages to export.",
  "result.noPreview": "No preview available",
  "result.downloadAllZip": "Download all as ZIP",
  "result.rotate": "Rotate",
  "result.editImage": "Edit Image",
  "result.addToMerge": "Add to PDF merge",
  "result.addToConvertPdf": "Add to Convert→PDF",
  "result.downloadStarted": "Download started",
  "result.zipDownloaded": "ZIP downloaded",
  "result.compare.before": "Before",
  "result.compare.after": "After",
  "result.loading": "Loading…",
  "result.oversize.body": "This file is quite large ({size}). Consider compressing it further before sharing.",
  "result.signatureReady": "Signature ready, drag it on the page, then click Apply",
  "result.signatureApplied": "Signature applied to the PDF",
  "result.applySignature": "Apply",
  "result.removeSignature": "Remove",
  "result.onPage": "On page {n}",
  "progress.working": "Working…",
  "progress.takeMoment": "This may take a moment for large files.",
  "modal.signature.title": "Add your signature",
  "modal.signature.draw": "Draw",
  "modal.signature.type": "Type",
  "modal.signature.placeholder": "Type your full name",
  "modal.signature.yourName": "Your Name",
  "modal.signature.apply": "Apply signature",
  "modal.signature.errors.emptyDraw": "Please draw your signature first.",
  "modal.signature.errors.emptyType": "Please type your name first.",
  "modal.description.title": "Add description / note",
  "modal.description.placeholder": "Type a note, description, or annotation here…",
  "modal.description.metadata": "Metadata only",
  "modal.description.metadataDesc": "Stored in the PDF's Subject / Keywords. Not visible on the page.",
  "modal.description.visible": "Visible text",
  "modal.description.visibleDesc": "Renders as text on page 1.",
  "modal.description.info": "Visible-text mode places the description as a footer note on page 1. For full drag-and-drop text annotations, use the Edit PDF tool.",
  "modal.description.apply": "Apply description",
  "toast.addedFiles": "Added {n} file(s)",
  "toast.filesLoaded": "Files loaded",
  "toast.encryptedPdf": "\u201c{name}\u201d is password-protected. Please remove the password first.",
  "toast.readPdfError": "Could not read PDF \u201c{name}\u201d: {msg}",
  "toast.rotatedAll": "Rotated all pages {dir}",
  "toast.rotatedPage": "Rotated page {n} {dir}",
  "toast.undone": "Undid last rotation",
  "toast.rotatedSaved": "Rotated PDF saved",
  "toast.watermarkApplied": "Watermark applied",
  "toast.pageNumbersAdded": "Page numbers added",
  "toast.compressed": "Compressed: {before} → {after} (−{pct}%)",
  "toast.compressedMinimal": "This PDF is already well-optimized. Savings were minimal.",
  "toast.exportedPng": "Exported {n} page(s) as PNG",
  "toast.exportedJpg": "Exported {n} page(s) as JPG",
  "toast.pdfAddedPickTool": "PDF added. Pick a tool below.",
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
  "hero.subtitle": "压缩、转换、合并、拆分、编辑与签名, 全部在你的浏览器中完成。真实处理、真实结果、无需上传。",
  "hero.dropzone.title": "拖拽文件到此处，或点击浏览",
  "hero.dropzone.subtitle": "支持 PDF、JPG、PNG、DOCX, 可同时上传多个文件",
  "hero.dropzone.cta": "选择文件",
  "hero.features.instant": "即时处理",
  "hero.features.private": "私密安全",
  "hero.features.chain": "自由串联工具",
  "hero.allTools": "全部工具",
  "hero.allTools.subtitle": "选择一个工具开始，或在上方拖入文件, 我们会自动为你跳转。",
  "hero.why.title.private": "真正私密",
  "hero.why.text.private": "每一字节都由你的浏览器处理，绝不上传到任何地方。",
  "hero.why.title.real": "真实结果",
  "hero.why.text.real": "由真实的 PDF 库执行处理, 没有假进度条，没有占位符。",
  "hero.why.title.chain": "自由串联",
  "hero.why.text.chain": "压缩 → 合并 → 签名 → 拆分，无需在中间按下下载。",
  "tool.back": "返回工具列表",
  "tool.chooseFiles": "选择文件",
  "tool.loading": "加载中…",
  "tool.clearAll": "全部清除",
  "tool.filesReady": "已就绪",
  "tool.addMore": "添加更多文件",
  "tool.dropHere": "或拖拽文件到此处",
  "tool.reminder": "你的文件会一直保留，直到你移除它们或重新开始, 它们会在工具之间跟随你。",
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
    "你可以在不下载的情况下串联多个工具。当前文件会一直保留在浏览器会话中，直到你按下下载, 随意再次压缩、签名或与其他文件合并。",
  "result.saved": "你节省了",
  "result.noResult": "暂无结果，请先运行一个工具。",
  "result.backHome": "返回首页",
  "result.expand": "放大",
  "footer.shortcut": "快捷键",
  "footer.madeWith": "由",
  "footer.builtClientSide": "客户端构建, 无需上传。",
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
  "common.fit": "适合",
  "common.openTool": "打开工具",
  "common.loading": "加载中…",
  "common.penColor": "笔色：",
  "common.stroke": "粗细：",
  "common.inkColor": "墨色：",
  "common.drawn": "手绘",
  "common.typed": "输入",
  "tool.compress.cta": "压缩 PDF",
  "tool.compress.chooseLevel": "选择压缩级别",
  "tool.compress.info": "选择质量级别, 文件越小质量略降，文件越大越清晰。",
  "tool.compress.alreadyOptimized": "此 PDF 已经优化得很好，节省空间有限。",
  "tool.compress.batchWarning": "批量模式：会先压缩第一个包含的文件。压缩完成后，可在结果页继续压缩下一个文件。",
  "tool.rotate.saveCta": "保存旋转后的 PDF",
  "tool.rotate.quickRotate": "快速旋转",
  "tool.rotate.rotateAllCw": "全部顺时针 90°",
  "tool.rotate.rotateAllCcw": "全部逆时针 90°",
  "tool.rotate.undo": "撤销",
  "tool.rotate.empty": "在上方拖入 PDF 即可开始旋转页面。",
  "tool.rotate.info": "单页旋转只会影响你点击的那一页，其它页面保持不变。工具栏按钮可一次性旋转所有页面。预览实时反映当前 PDF 的状态。",
  "tool.rotate.loadingPages": "正在加载页面…",
  "tool.rotate.undoEmpty": "没有可撤销的操作。",
  "tool.watermark.cta": "应用水印",
  "tool.watermark.textMode": "文字水印",
  "tool.watermark.imageMode": "图片水印",
  "tool.watermark.watermarkText": "水印文字",
  "tool.watermark.fontSize": "字号",
  "tool.watermark.rotation": "旋转角度",
  "tool.watermark.imageScale": "图片比例",
  "tool.watermark.opacity": "不透明度",
  "tool.watermark.color": "颜色",
  "tool.watermark.position": "位置",
  "tool.watermark.applyTo": "应用至",
  "tool.watermark.preview": "预览",
  "tool.watermark.empty": "在上方拖入 PDF 即可添加水印。",
  "tool.watermark.info": "此处预览仅为示意。实际水印将通过 pdf-lib 按精确坐标嵌入到 PDF 中。",
  "tool.watermark.imageLoaded": "图片已加载, 点击重新上传",
  "tool.watermark.uploadImage": "上传 PNG 或 JPG",
  "tool.pageNumbers.cta": "添加页码",
  "tool.pageNumbers.format": "格式",
  "tool.pageNumbers.position": "位置",
  "tool.pageNumbers.fontSize": "字号",
  "tool.pageNumbers.startFrom": "起始页码",
  "tool.pageNumbers.empty": "在上方拖入 PDF 即可添加页码。",
  "tool.pageNumbers.info": "页码通过 pdf-lib 的 drawText 与 Helvetica 字体嵌入到 PDF 中。",
  "tool.pageNumbers.previewLabel": "预览（第 2 页，共 5 页）",
  "tool.pdfToPng.renderScale": "渲染缩放",
  "tool.pdfToPng.scaleHint": "数值越大越清晰，但文件也越大。",
  "tool.pdfToPng.selectPages": "选择页面（可选）",
  "tool.pdfToPng.selectPagesHint": "留空则导出所有页面。勾选复选框可仅导出指定页面。",
  "tool.pdfToPng.info": "所选每一页都将转成 PNG。结果页会以画廊形式展示, 可逐一下载或全部打包成 ZIP。",
  "tool.pdfToPng.empty": "在上方拖入 PDF 即可选择要导出的页面。",
  "result.noPreview": "暂无预览",
  "result.downloadAllZip": "全部打包为 ZIP 下载",
  "result.rotate": "旋转",
  "result.editImage": "编辑图片",
  "result.addToMerge": "添加到 PDF 合并",
  "result.addToConvertPdf": "添加到「转 PDF」",
  "result.downloadStarted": "已开始下载",
  "result.zipDownloaded": "ZIP 已下载",
  "result.compare.before": "之前",
  "result.compare.after": "之后",
  "result.loading": "加载中…",
  "result.oversize.body": "文件较大（{size}）。建议在分享前进一步压缩。",
  "result.signatureReady": "签名已就绪, 拖到页面上合适位置后点击「应用」",
  "result.signatureApplied": "签名已应用到 PDF",
  "result.applySignature": "应用",
  "result.removeSignature": "移除",
  "result.onPage": "第 {n} 页",
  "progress.working": "处理中…",
  "progress.takeMoment": "大文件可能需要一些时间，请稍候。",
  "modal.signature.title": "添加你的签名",
  "modal.signature.draw": "手绘",
  "modal.signature.type": "输入",
  "modal.signature.placeholder": "输入你的姓名",
  "modal.signature.yourName": "你的姓名",
  "modal.signature.apply": "应用签名",
  "modal.signature.errors.emptyDraw": "请先绘制签名。",
  "modal.signature.errors.emptyType": "请先输入你的姓名。",
  "modal.description.title": "添加描述 / 备注",
  "modal.description.placeholder": "在此输入备注、描述或标注…",
  "modal.description.metadata": "仅元数据",
  "modal.description.metadataDesc": "保存在 PDF 的 Subject / Keywords 字段，页面上不可见。",
  "modal.description.visible": "可见文字",
  "modal.description.visibleDesc": "作为第 1 页上的文字渲染。",
  "modal.description.info": "「可见文字」模式会将描述作为页脚备注放在第 1 页。如需完整的拖放式文字标注，请使用「编辑 PDF」工具。",
  "modal.description.apply": "应用描述",
  "toast.addedFiles": "已添加 {n} 个文件",
  "toast.filesLoaded": "文件已加载",
  "toast.encryptedPdf": "\u201c{name}\u201d 已加密，请先移除密码。",
  "toast.readPdfError": "无法读取 PDF \u201c{name}\u201d：{msg}",
  "toast.rotatedAll": "已旋转所有页面 {dir}",
  "toast.rotatedPage": "已旋转第 {n} 页 {dir}",
  "toast.undone": "已撤销上一次旋转",
  "toast.rotatedSaved": "已保存旋转后的 PDF",
  "toast.watermarkApplied": "水印已应用",
  "toast.pageNumbersAdded": "页码已添加",
  "toast.compressed": "已压缩：{before} → {after} (−{pct}%)",
  "toast.compressedMinimal": "此 PDF 已经优化得很好，节省空间有限。",
  "toast.exportedPng": "已导出 {n} 页为 PNG",
  "toast.exportedJpg": "已导出 {n} 页为 JPG",
  "toast.pdfAddedPickTool": "PDF 已添加，请在下方选择一个工具。",
};

export const DICTS: Record<Lang, Dict> = { en, zh };

/** Tool descriptions also need i18n, separate dictionary. */
export type ToolDescKey = "name" | "short" | "desc";

export const TOOL_NAMES: Record<Lang, Record<string, { name: string; short: string; desc: string }>> = {
  en: {
    "compress-pdf": { name: "PDF Compressor", short: "Compress", desc: "Shrink PDFs up to 75%, pick your quality vs size trade-off." },
    "compress-png": { name: "Image Compressor", short: "Compress", desc: "Make PNG and JPG files smaller, see the result instantly as you drag the slider." },
    "pdf-to-word": { name: "PDF to Word", short: "Convert", desc: "Turn a PDF into an editable Word document you can actually open and edit." },
    "word-to-pdf": { name: "Word to PDF", short: "Convert", desc: "Turn a Word document into a clean, shareable PDF." },
    "pdf-to-jpg": { name: "PDF to JPG", short: "Convert", desc: "Turn each page of a PDF into a JPG image, download one or all as a ZIP." },
    "pdf-to-png": { name: "PDF to PNG", short: "Convert", desc: "Turn each page of a PDF into a PNG image, download one or all as a ZIP." },
    "convert-to-pdf": { name: "Convert to PDF", short: "Convert", desc: "Turn any image or document into a PDF, JPG, PNG, even another PDF." },
    "image-converter": { name: "JPG ↔ PNG", short: "Convert", desc: "Convert between JPG and PNG, or batch convert multiple images at once." },
    "image-to-text": { name: "Image to Text", short: "Convert", desc: "Extract text from photos, screenshots, or scanned documents using OCR." },
    "split-pdf": { name: "Split PDF", short: "Organize", desc: "Pick exactly which pages to keep, by checkbox or by typing page numbers." },
    "merge-pdf": { name: "Merge PDF", short: "Organize", desc: "Mix PDFs and images into one PDF. Choose which pages to include from each file." },
    "reorder-pdf": { name: "Reorder Pages", short: "Organize", desc: "Drag pages around to put them in any order you want." },
    "edit-pdf": { name: "Edit PDF", short: "Edit & Sign", desc: "Rotate one page (not all of them), delete, duplicate, draw, sign, add text." },
    "watermark-pdf": { name: "Watermark PDF", short: "Edit & Sign", desc: "Stamp a text or image watermark across every page." },
    "page-numbers": { name: "Page Numbers", short: "Edit & Sign", desc: "Add page numbers in 4 formats, in 4 positions, one click." },
    "extract-text": { name: "Extract Text", short: "Convert", desc: "Pull all the text out of a PDF into a plain text file." },
    "redact-pdf": { name: "Redact PDF", short: "Edit & Sign", desc: "Permanently black out sensitive text so it can never be recovered." },
    "rotate-pdf": { name: "Rotate PDF", short: "Organize", desc: "Fix sideways or upside-down pages, quick standalone tool." },
    "delete-pages": { name: "Delete Pages", short: "Organize", desc: "Remove pages you don't need, no need to open the full editor." },
    "crop-pdf": { name: "Crop PDF", short: "Organize", desc: "Trim margins and whitespace from your pages." },
    "edit-png": { name: "Edit Image", short: "Edit & Sign", desc: "Annotate PNG and JPG images, draw, add text, shapes, crop, rotate." },
  },
  zh: {
    "compress-pdf": { name: "PDF 压缩", short: "压缩", desc: "把 PDF 缩小到原来的 25%, 自由选择清晰度与大小。" },
    "compress-png": { name: "图片压缩", short: "压缩", desc: "让 PNG 和 JPG 文件更小, 拖动滑块即时看到结果。" },
    "pdf-to-word": { name: "PDF 转 Word", short: "转换", desc: "把 PDF 转成可编辑的 Word 文档，能直接打开并修改。" },
    "word-to-pdf": { name: "Word 转 PDF", short: "转换", desc: "把 Word 文档转成清晰、易分享的 PDF。" },
    "pdf-to-jpg": { name: "PDF 转 JPG", short: "转换", desc: "把 PDF 的每一页都转成 JPG 图片, 可单独下载或打包成 ZIP。" },
    "pdf-to-png": { name: "PDF 转 PNG", short: "转换", desc: "把 PDF 的每一页都转成 PNG 图片, 可单独下载或打包成 ZIP。" },
    "convert-to-pdf": { name: "转为 PDF", short: "转换", desc: "把任何图片或文档转成 PDF, 支持 JPG、PNG，甚至另一个 PDF。" },
    "image-converter": { name: "JPG ↔ PNG", short: "转换", desc: "在 JPG 和 PNG 之间转换, 或批量转换多张图片。" },
    "image-to-text": { name: "图片转文字", short: "转换", desc: "使用 OCR 从照片、截图或扫描件中提取文字。" },
    "split-pdf": { name: "拆分 PDF", short: "整理", desc: "精确选择要保留的页面, 用复选框或输入页码。" },
    "merge-pdf": { name: "合并 PDF", short: "整理", desc: "把 PDF 和图片混搭成一个 PDF。可从每个文件中挑选要包含的页面。" },
    "reorder-pdf": { name: "重排页面", short: "整理", desc: "拖动页面调整顺序，随心所欲。" },
    "edit-pdf": { name: "编辑 PDF", short: "编辑与签名", desc: "只旋转当前页（不是全部）、删除、复制、绘制、签名、添加文字。" },
    "watermark-pdf": { name: "PDF 水印", short: "编辑与签名", desc: "在每一页盖上文字或图片水印。" },
    "page-numbers": { name: "页码", short: "编辑与签名", desc: "4 种格式、4 个位置, 一键添加页码。" },
    "extract-text": { name: "提取文字", short: "转换", desc: "把 PDF 里的所有文字提取成一个纯文本文件。" },
    "redact-pdf": { name: "PDF 涂黑", short: "编辑与签名", desc: "永久涂黑敏感文字, 永远无法恢复。" },
    "rotate-pdf": { name: "旋转 PDF", short: "整理", desc: "修复横躺或倒立的页面, 快捷独立工具。" },
    "delete-pages": { name: "删除页面", short: "整理", desc: "移除不需要的页面, 无需打开完整编辑器。" },
    "crop-pdf": { name: "裁剪 PDF", short: "整理", desc: "裁掉页面的边距与空白。" },
    "edit-png": { name: "图片编辑", short: "编辑与签名", desc: "标注 PNG 和 JPG 图片, 绘制、加文字、加形状、裁剪、旋转。" },
  },
};
