# LinkWed · 数字婚礼请柬

LinkWed 是一款面向中国用户的数字婚礼请柬模板，支持移动端优先的编辑与预览、相册上传、背景音乐自选以及高德地图位置展示，让新人能够快速生成可分享的浪漫请柬。

## 功能亮点
- 📱 **双页面体验**：编辑页与预览页通过底部导航切换，手机上也能顺滑操作，修改实时生效。
- 📸 **图片故事**：支持封面图与最多 6 张相册照片，拖拽上传即可生成柔和的拼图布局。
- 🎵 **婚礼音乐库**：默认循环音色外，内置 3 首 Bensound 婚礼钢琴曲，可随时试听或上传自定义音频。
- 📍 **高德地图**：集成 JS API，支持地点搜索与点击选点，自动同步坐标与地址信息。
- 🌸 **中文界面**：包含新人信息、日程安排、故事文案等模块，所有文案预设为中文风格，可直接修改。
- 🌐 **多人同步**：邀请函内容保存在服务器端，任意设备编辑后刷新即可看到最新版本，便于团队协同。
- 💾 **自动保存**：所有编辑内容（含图片、音乐、地图位置）都会自动保存，无需手动操作。

## 技术栈
- Vite + React 19 + TypeScript
- Tailwind CSS + Framer Motion 动画
- React Dropzone 文件拖拽上传
- 高德地图 JavaScript API（通过 `@amap/amap-jsapi-loader` 动态加载）

## 环境要求
- Node.js ≥ 20.11（官方推荐 20.19+）
- npm ≥ 10
- 高德地图 Web 端 Key（必填）

> **环境变量**
> - `VITE_AMAP_KEY`：高德地图 Web 端 Key（必填）。
> - `VITE_AMAP_JS_CODE`：若密钥开启了安全校验，可配置 JS 安全码（可选）。
> 将其写入项目根目录的 `.env` 或 `.env.local` 中，例如：
> ```bash
> VITE_AMAP_KEY=你的高德Key
> VITE_AMAP_JS_CODE=可选的JS安全码
> ```
> 如果未设置，应用会回退到内置演示 Key（`7897d07c1c16a4da56995e13968b1641`），仅用于测试环境，请在生产部署前更换。

## 快速开始
```bash
npm install
npm run server
# 另开终端
npm run dev
```
Vite 会将 `/api` 与 `/uploads` 请求代理到 `http://localhost:3000`，因此直接访问 `http://localhost:5173` 即可体验多人协同编辑。

### 常用脚本
- `npm run dev`：本地开发环境
- `npm run build`：类型检查 + 构建生产包
- `npm run preview`：本地预览打包结果（需另启 `npm run server` 才能保存数据）

## 使用指引
- **基本信息**：编辑新人姓名、日期、时间、故事、回复方式等字段，右侧预览实时更新。
- **相册管理**：封面图与相册均支持拖拽上传，鼠标悬停可一键移除。
- **地图与地点**：输入关键词进行高德地点搜索，或直接在地图上点击选点；选中后坐标与地址会同步到请柬。
- **音乐选择**：内置曲目显示署名说明，可随时切换或上传自定义音频，并支持音量及播放控制。

## 音频版权
- `background.wav`：LinkWed 内置循环音频，仅供演示。
- `bensound-romantic.mp3`、`bensound-tenderness.mp3`、`bensound-love.mp3`：来自 [Bensound.com](https://www.bensound.com/)，免费授权需保留署名，仅限非商业用途。请在正式投放前确认授权范围。

## 部署
```bash
npm run build
npm run server
```
或使用仓库内的 `deploy.sh` 进行 Docker 构建并运行 Node/Express 服务（容器默认监听 80 端口，部署后可直接使用服务器 IP 访问；若需调整可通过 `PORT=8080 ./deploy.sh` 覆盖）。邀请函数据会持久化到 `data/invitation.json`，上传的图片与音频存放在 `public/uploads/`，确保不同访客共享同一份内容。

祝使用顺利，创作一封独一无二的婚礼请柬！💍
