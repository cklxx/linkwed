import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { nanoid } from 'nanoid'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import fsSync from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.join(__dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
const DIST_DIR = path.join(ROOT, 'dist')
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads')
const DATA_DIR = path.join(ROOT, 'data')
const DATA_FILE = path.join(DATA_DIR, 'invitation.json')

const ensureDirectories = async () => {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  await fs.mkdir(DATA_DIR, { recursive: true })
}

const DEFAULT_INVITATION = {
  details: {
    coupleNames: '林深 & 叶溪',
    tagline: '邀您见证我们携手走向新篇章',
    eventDate: '2025-10-18',
    eventTime: '16:30',
    venue: '杭州 · 西湖烟霞堂',
    address: '浙江省杭州市西湖区龙井路 28 号',
    story: '从龙井小径的第一声问候，到无数次并肩看日落，我们把日常写成了最温柔的誓言。愿在这个秋日晚风里，与您共享花影与笑语。',
    hashtag: '#林叶之约',
    rsvpLink: 'mailto:rsvp@linkwed.app',
    customMessage: '诚挚邀请您于 2025 年 9 月 12 日前回复出席。仪式结束后备有湖畔晚宴与温馨致辞，期待您的祝福。',
    schedule: [
      {
        time: '16:30',
        label: '迎宾花园茶歇',
        description: '茉莉冷泡与轻柔弦乐，为您铺陈浪漫的序章。',
      },
      {
        time: '17:15',
        label: '烟霞堂誓言',
        description: '晚风吹皱湖面，在亲友见证下许下笃定誓言。',
      },
      {
        time: '18:30',
        label: '湖畔星光宴',
        description: '季节限定的风味盛宴，与亲友共享幸福时刻。',
      },
    ],
  },
  coordinates: { lat: 30.243056, lng: 120.150833 },
  locationQuery: '西湖烟霞堂',
  heroImage: null,
  galleryImages: [],
  music: {
    id: 'default',
    name: '浪漫花海（默认循环）',
    src: '/media/background.wav',
    isDefault: true,
    credit: 'LinkWed 内置音频循环',
  },
  volume: 0.6,
  updatedAt: new Date().toISOString(),
}

const readInvitation = async () => {
  try {
    if (!fsSync.existsSync(DATA_FILE)) {
      const seeded = await saveInvitation(DEFAULT_INVITATION)
      return { ...seeded, isNew: true }
    }
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return parsed
  } catch (error) {
    console.error('读取邀请数据失败', error)
    return { ...DEFAULT_INVITATION, error: 'failed_to_read' }
  }
}

const saveInvitation = async (payload) => {
  const data = {
    ...DEFAULT_INVITATION,
    ...payload,
    details: {
      ...DEFAULT_INVITATION.details,
      ...payload.details,
      schedule: Array.isArray(payload?.details?.schedule)
        ? payload.details.schedule.map((item) => ({
            time: item.time ?? '',
            label: item.label ?? '',
            description: item.description ?? '',
          }))
        : DEFAULT_INVITATION.details.schedule,
    },
    coordinates: payload.coordinates ?? DEFAULT_INVITATION.coordinates,
    locationQuery: payload.locationQuery ?? DEFAULT_INVITATION.locationQuery,
    heroImage: payload.heroImage ?? null,
    galleryImages: Array.isArray(payload.galleryImages) ? payload.galleryImages : [],
    music: {
      ...DEFAULT_INVITATION.music,
      ...payload.music,
    },
    volume: typeof payload.volume === 'number' ? payload.volume : DEFAULT_INVITATION.volume,
    updatedAt: new Date().toISOString(),
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  return data
}

const bootstrap = async () => {
  await ensureDirectories()

  const app = express()
  const PORT = process.env.SERVER_PORT || process.env.PORT || 3000

  // 打印配置信息
  console.log('📁 Server directories:')
  console.log('   ROOT:', ROOT)
  console.log('   PUBLIC_DIR:', PUBLIC_DIR)
  console.log('   UPLOAD_DIR:', UPLOAD_DIR)
  console.log('   DIST_DIR:', DIST_DIR)
  console.log('   DATA_DIR:', DATA_DIR)

  // 检查目录是否存在
  console.log('\n📂 Directory status:')
  console.log('   UPLOAD_DIR exists:', fsSync.existsSync(UPLOAD_DIR))
  console.log('   DIST_DIR exists:', fsSync.existsSync(DIST_DIR))

  app.use(cors())
  app.use(express.json({ limit: '25mb' }))

  // 静态文件服务 - 必须在通配路由之前
  app.use('/uploads', express.static(UPLOAD_DIR, {
    setHeaders: (res, filePath) => {
      // 设置正确的 Content-Type
      if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg')
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png')
      } else if (filePath.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp')
      }
    }
  }))
  app.use(express.static(DIST_DIR))

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOAD_DIR)
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname)
      const provided = req.body?.fileId
      if (provided) {
        cb(null, provided)
        return
      }
      cb(null, `${Date.now()}-${nanoid(8)}${ext}`)
    },
  })

  const upload = multer({
    storage,
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  })

  app.get('/api/invitation', async (_req, res) => {
    const data = await readInvitation()
    res.json(data)
  })

  app.post('/api/invitation', async (req, res) => {
    try {
      const saved = await saveInvitation(req.body ?? {})
      res.json(saved)
    } catch (error) {
      console.error('保存邀请数据失败', error)
      res.status(500).json({ message: '保存失败', error: error instanceof Error ? error.message : String(error) })
    }
  })

  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      console.error('❌ Upload failed: No file received')
      res.status(400).json({ message: '未接收到文件' })
      return
    }

    const fileInfo = {
      id: req.file.filename,
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      type: req.file.mimetype,
      size: req.file.size,
      savedPath: req.file.path,
    }

    console.log('✅ File uploaded successfully:')
    console.log('   Filename:', fileInfo.id)
    console.log('   Original:', fileInfo.name)
    console.log('   Saved to:', fileInfo.savedPath)
    console.log('   Size:', (fileInfo.size / 1024).toFixed(2), 'KB')
    console.log('   URL:', fileInfo.url)

    // 验证文件是否真实存在
    if (!fsSync.existsSync(fileInfo.savedPath)) {
      console.error('❌ File not found after save:', fileInfo.savedPath)
      res.status(500).json({ message: '文件保存失败' })
      return
    }

    res.json(fileInfo)
  })

  // 通配路由 - 必须在最后，处理 SPA 路由
  app.get('*', (req, res, next) => {
    // 跳过 API 和静态资源请求
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next()
    }

    const indexPath = path.join(DIST_DIR, 'index.html')
    if (fsSync.existsSync(indexPath)) {
      res.sendFile(indexPath)
    } else {
      res.status(404).send('Application not built yet. Run: npm run build')
    }
  })

  app.listen(PORT, () => {
    console.log(`🚀 Invitation server running on http://0.0.0.0:${PORT}`)
  })
}

bootstrap().catch((error) => {
  console.error('服务器启动失败', error)
  process.exit(1)
})
