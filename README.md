# AI-PPT-Extractor 🎨

<div align="center">

**🚀 Turn Static Slide Images into Fully Editable Presentations with AI**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Powered by AI](https://img.shields.io/badge/Powered%20by-Gemini%20%26%20GPT--5-orange.svg)](https://github.com/FuTseYi/AI-PPT-Extractor)

[English](#english) | [中文](#中文)

</div>

---

## English

### 🌟 What is AI-PPT-Extractor?

**AI-PPT-Extractor** is an intelligent PowerPoint reverse engineering tool that leverages cutting-edge AI vision models (Google Gemini / OpenAI GPT-5) to **deconstruct static slide images** into fully editable `.pptx` files.

Unlike traditional PPT generators that produce static images, this tool extracts individual layers (background, text, visual elements) and reconstructs them as **native PowerPoint objects** - making every element editable, movable, and customizable.

### 💡 Why This Tool?

Recent AI-powered PPT generation tools (like [banana-slides](https://github.com/Anionex/banana-slides)) create stunning presentations, but they output **static images** - making post-editing nearly impossible. 

**AI-PPT-Extractor solves this problem** by:
- 🔍 **Extracting** text, images, and shapes from slide screenshots
- 🎨 **Removing** text overlays and reconstructing clean backgrounds
- 🔧 **Converting** visual elements into editable PPT objects
- 📥 **Exporting** everything as a native `.pptx` file

### ✨ Key Features

- **📂 Multi-Format Support**: Upload PDF, PNG, JPG slides (batch processing supported)
- **🧠 AI Layout Analysis**: 
  - Precise detection of text blocks, visual elements, and background colors
  - Automatic separation of text and visual layers
- **🎨 Intelligent Background Restoration**:
  - **Auto Text Removal**: AI erases text and reconstructs background textures
  - **Manual Eraser**: Select regions to remove unwanted elements
- **✏️ Vector Conversion (Beta)**: Convert simple shapes (rectangles, circles, arrows) into native PPT shapes
- **🛠️ Manual Correction Workflow**: 
  - Interactive canvas for adjusting detection boxes
  - Modify element types (text/image) or delete false positives
- **📥 One-Click Export**: Export individual slides or entire presentations as `.pptx`
- **⚙️ Multi-Model Support**: Switch between Google Gemini and OpenAI (GPT-5/o1/o3) backends

### 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **AI Integration**: Google GenAI SDK (`@google/genai`), OpenAI API Compatible
- **File Handling**: `pptxgenjs` (PPT generation), `pdfjs-dist` (PDF parsing)

### 🚀 Quick Start

#### 1. Prerequisites

- **Node.js** v18+ installed
- Clone or download this repository

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure API Keys

**Option A (Environment Variables)**: Create `.env.local` in the root directory:
```env
GEMINI_API_KEY=your_google_gemini_key
```

**Option B (UI Settings)**: After launching, click the settings icon in the top-right corner to manually input API keys and Base URLs.

#### 4. Launch

```bash
npm run dev
```

Visit `http://localhost:3000` to start using the tool.

### 📖 Workflow

**4-Step Process:**

1. **Upload** 
   - Drag & drop PDF/image files
   - Select a slide from the sidebar

2. **Analyze** 
   - Click **"Analyze Layout"**
   - AI detects page structure (takes a few seconds)

3. **Correct** 
   - **Blue boxes** = Text, **Orange boxes** = Images
   - Drag to resize, right-click to modify/delete
   - Click **"Confirm & Process"**

4. **Edit & Export** 
   - AI generates text-removed background
   - **Image Mode**: View final result, erase regions, or regenerate elements
   - **Vector Mode**: Convert icons to shapes
   - Click **"Export Current Slide"** or **"Export All Slides"**

### ⚙️ Model Configuration

#### Google Gemini
- **Recognition Model**: `gemini-3-pro-preview` (better vision understanding)
- **Drawing Model**: `gemini-2.5-flash-image` (supports image-to-image)

#### OpenAI Compatible (Supports 3rd-party models)
- **Recognition Model**: `gpt-4o`, `gpt-4o-mini`, `o1`, `o3-mini` or other Vision models (e.g., `Qwen/Qwen2-VL-72B-Instruct`, `Claude-3.5-Sonnet`)
- **Drawing Model**: `dall-e-3` or image generation models
- **JSON Mode Support**: 
  - ✅ GPT-4/GPT-5 series, o1/o3 series: Enable checkbox
  - ❌ Qwen/Claude/Open-source models: **Disable checkbox**
  - If you see `Json mode is not supported for this model` error, uncheck this option in settings

### 🔧 Troubleshooting

#### Q: "Json mode is not supported for this model" error?
**A:** Your model (e.g., Qwen) doesn't support OpenAI's JSON response format. Solution:
1. Open settings panel (top-right)
2. Switch to "OpenAI Settings" tab
3. **Uncheck** "Supports JSON Mode (response_format)"
4. Save and retry

#### Q: Which models support JSON mode?
**A:** 
- ✅ **Supported**: GPT-4, GPT-4o, GPT-4o-mini, GPT-5, o1, o3-mini (OpenAI official models)
- ❌ **Not Supported**: Qwen, Claude, Llama, most open-source models (via 3rd-party APIs)

### ⚠️ Known Limitations

- **Text Editing**: OCR detects text content, but in-app editing is not supported (edit in exported PPT)
- **Formulas**: LaTeX is recognized but exported as plain text (use MathType plugin)
- **Batch Processing**: Manual review required for each slide to ensure accuracy
- **Save State**: No auto-save - complete the workflow before closing

### 📄 License & Credits

**Author**: 謝懿Shine ([@FuTseYi](https://github.com/FuTseYi))

This project was developed with AI assistance (Google Gemini). Core logic and architecture designed by the author.

**License**: [MIT License](LICENSE) - Copyright © 2025 謝懿Shine. All Rights Reserved.

---

**Disclaimer**: This tool is for educational purposes only. Do not use it to extract copyrighted commercial PPT templates for profit. AI service costs are borne by the user.

---

## 中文

### 🌟 什么是 AI-PPT-Extractor？

**AI-PPT-Extractor（AI PPT 提取器）** 是一款智能 PowerPoint 反向工程工具，利用前沿 AI 视觉模型（Google Gemini / OpenAI GPT-5）将**静态幻灯片图片**拆解为完全可编辑的 `.pptx` 文件。

与传统 PPT 生成工具输出静态图片不同，本工具提取各个图层（背景、文字、视觉元素）并重构为 **PPT 原生对象** - 让每个元素都可编辑、可移动、可自定义。

### 💡 为什么需要这个工具？

最近的 AI 驱动 PPT 生成工具（如 [banana-slides](https://github.com/Anionex/banana-slides)）能创建精美演示文稿，但它们输出的是**静态图片** - 几乎无法进行后期编辑。

**AI-PPT-Extractor 解决了这个问题**：
- 🔍 **提取** 幻灯片截图中的文字、图片和形状
- 🎨 **移除** 文字覆盖层并重建干净背景
- 🔧 **转换** 视觉元素为可编辑的 PPT 对象
- 📥 **导出** 所有内容为原生 `.pptx` 文件

### ✨ 核心功能

- **📂 多格式支持**：上传 PDF、PNG、JPG 幻灯片（支持批量处理）
- **🧠 AI 布局分析**：
  - 精确检测文本块、视觉元素和背景颜色
  - 自动分离文本层和视觉层
- **🎨 智能背景修复**：
  - **自动去字**：AI 擦除文字并重建背景纹理
  - **手动橡皮擦**：选择区域移除不需要的元素
- **✏️ 矢量转换（Beta）**：将简单形状（矩形、圆形、箭头）转换为 PPT 原生形状
- **🛠️ 人工校正工作流**：
  - 交互式画布调整检测框
  - 修改元素类型（文本/图片）或删除误检
- **📥 一键导出**：导出单页或整个演示文稿为 `.pptx`
- **⚙️ 多模型支持**：在 Google Gemini 和 OpenAI (GPT-5/o1/o3) 后端之间切换

### 🛠️ 技术栈

- **前端**: React 19, TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **AI 集成**: Google GenAI SDK (`@google/genai`), OpenAI API Compatible
- **文件处理**: `pptxgenjs` (PPT生成), `pdfjs-dist` (PDF分析)

### 🚀 快速开始

#### 1. 环境准备

- 已安装 **Node.js** v18+
- 克隆或下载本仓库

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置 API Key

**方式 A（环境变量）**：在根目录创建 `.env.local` 文件：
```env
GEMINI_API_KEY=你的_Google_Gemini_Key
```

**方式 B（UI 设置）**：启动后，点击右上角设置图标手动输入 API Key 和 Base URL。

#### 4. 启动项目

```bash
npm run dev
```

访问 `http://localhost:3000` 开始使用。

### 📖 操作流程

**4 步工作流：**

1. **上传** 
   - 拖拽 PDF/图片文件
   - 从侧边栏选择幻灯片

2. **分析** 
   - 点击 **"开始分析布局"**
   - AI 识别页面结构（需要几秒钟）

3. **校正** 
   - **蓝色框** = 文字，**橙色框** = 图片
   - 拖拽调整大小，右键修改/删除
   - 点击 **"确认并处理"**

4. **编辑与导出** 
   - AI 生成去除文字的背景
   - **图片模式**：查看最终效果，擦除区域或重新生成元素
   - **矢量模式**：将图标转为形状
   - 点击 **"导出当前页"** 或 **"导出全部幻灯片"**

### ⚙️ 模型配置建议

#### Google Gemini
- **识别模型**: `gemini-3-pro-preview`（更强的视觉理解能力）
- **绘图模型**: `gemini-2.5-flash-image`（支持图生图）

#### OpenAI Compatible（支持第三方模型）
- **识别模型**: `gpt-4o`, `gpt-4o-mini`, `o1`, `o3-mini` 或其他 Vision 模型（如 `Qwen/Qwen2-VL-72B-Instruct`, `Claude-3.5-Sonnet`）
- **绘图模型**: `dall-e-3` 或图像生成模型
- **JSON 模式支持**: 
  - ✅ GPT-4/GPT-5 系列、o1/o3 系列：勾选复选框
  - ❌ Qwen/Claude/开源模型：**取消勾选**
  - 如果遇到 `Json mode is not supported for this model` 错误，请在设置中取消勾选

### 🔧 常见问题

#### Q: 遇到 "Json mode is not supported for this model" 错误？
**A:** 您使用的模型（如 Qwen）不支持 OpenAI 的 JSON 响应格式。解决方法：
1. 打开设置面板（右上角）
2. 切换到 "OpenAI 设置" 标签
3. **取消勾选** "支持 JSON 模式 (response_format)"
4. 保存并重试

#### Q: 哪些模型支持 JSON 模式？
**A:** 
- ✅ **支持**: GPT（OpenAI 官方）
- ❌ **不支持**: Qwen、Claude、大部分开源模型（通过第三方 API）

### ⚠️ 已知限制

- **文字编辑**：OCR 识别文字内容，但不支持应用内编辑（在导出的 PPT 中编辑）
- **公式**：识别 LaTeX 但导出为纯文本（使用 MathType 插件）
- **批量处理**：每张幻灯片需要手动审核以确保准确性
- **保存状态**：无自动保存 - 完成工作流后再关闭

### 📄 许可与致谢

**作者**: 謝懿Shine ([@FuTseYi](https://github.com/FuTseYi))

本项目在 AI 辅助下开发（Google Gemini）。核心逻辑和架构由作者设计。

**许可**: [MIT License](LICENSE) - Copyright © 2025 謝懿Shine. All Rights Reserved.

---

**免责声明**: 本工具仅供学习交流使用。请勿用于提取有版权保护的商业 PPT 模板进行盈利。AI 服务费用由用户承担。

---

<div align="center">

**⭐ If you find this project helpful, please give it a star! ⭐**

**如果这个项目对你有帮助，请给个 Star！**

Made with ❤️ by 謝懿Shine

</div>
