import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  Eye,
  Heart,
  ImagePlus,
  LocateFixed,
  MapPin,
  Music2,
  Pause,
  Play,
  Upload,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react'
import clsx from 'clsx'
import type {
  Coordinates,
  InvitationDetails,
  LocationResult,
  MusicTrack,
  ScheduleItem,
  UploadedImage,
} from './types/invitation'
import {
  loadSnapshot,
  removeUnusedAssets,
  saveSnapshot,
  upsertAsset,
  type StoredImageMeta,
  type StoredMusicMeta,
  type StoredState,
} from './utils/persistence'
import { AMAP_KEY } from './config/amap'

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch (error) {
      // ignore and fall through to fallback
    }
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

const InvitationMap = lazy(() => import('./components/InvitationMap'))

const DEFAULT_DETAILS: InvitationDetails = {
  coupleNames: '林深 & 叶溪',
  tagline: '邀您见证我们携手走向新篇章',
  eventDate: '2025-10-18',
  eventTime: '16:30',
  venue: '杭州 · 西湖烟霞堂',
  address: '浙江省杭州市西湖区龙井路 28 号',
  story:
    '从龙井小径的第一声问候，到无数次并肩看日落，我们把日常写成了最温柔的誓言。愿在这个秋日晚风里，与您共享花影与笑语。',
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
}

const DEFAULT_COORDINATES: Coordinates = { lat: 30.243056, lng: 120.150833 }

const DEFAULT_TRACK: MusicTrack = {
  id: 'default',
  name: '浪漫花海（默认循环）',
  src: '/media/background.wav',
  isDefault: true,
  credit: 'LinkWed 内置音频循环',
}

const PRESET_TRACKS: MusicTrack[] = [
  DEFAULT_TRACK,
  {
    id: 'romantic',
    name: 'Bensound · Romantic（婚礼钢琴）',
    src: '/media/bensound-romantic.mp3',
    isDefault: false,
    credit: '来源：Bensound.com，需署名使用',
  },
  {
    id: 'tenderness',
    name: 'Bensound · Tenderness（温柔钢琴）',
    src: '/media/bensound-tenderness.mp3',
    isDefault: false,
    credit: '来源：Bensound.com，需署名使用',
  },
  {
    id: 'love',
    name: 'Bensound · Love（暖心旋律）',
    src: '/media/bensound-love.mp3',
    isDefault: false,
    credit: '来源：Bensound.com，需署名使用',
  },
]

const formatDate = (input: string) => {
  try {
    return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'full' }).format(new Date(input))
  } catch (error) {
    return input
  }
}

const formatTime = (input: string) => {
  try {
    const [hours, minutes] = input.split(':').map(Number)
    const date = new Date()
    date.setHours(hours)
    date.setMinutes(minutes)
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  } catch (error) {
    return input
  }
}

function App() {
  const [details, setDetails] = useState<InvitationDetails>(DEFAULT_DETAILS)
  const [heroImage, setHeroImage] = useState<UploadedImage | null>(null)
  const [galleryImages, setGalleryImages] = useState<UploadedImage[]>([])
  const [coordinates, setCoordinates] = useState<Coordinates>(DEFAULT_COORDINATES)
  const [locationQuery, setLocationQuery] = useState('西湖烟霞堂')
  const [locationResults, setLocationResults] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [musicTrack, setMusicTrack] = useState<MusicTrack>({ ...DEFAULT_TRACK })
  const [isMusicPlaying, setIsMusicPlaying] = useState(true)
  const [musicError, setMusicError] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.6)
  const [isSaving, setIsSaving] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(min-width: 1024px)').matches
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousMusicUrl = useRef<string | null>(null)
  const hasHydratedRef = useRef(false)
  const saveTimerRef = useRef<number | null>(null)

  const location = useLocation()
  const navigate = useNavigate()
  const isPreviewPage = location.pathname !== '/edit'

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(min-width: 1024px)')
    const listener = (event: MediaQueryListEvent) => setIsDesktop(event.matches)

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener)
    } else {
      media.addListener(listener)
    }

    setIsDesktop(media.matches)

    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', listener)
      } else {
        media.removeListener(listener)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (heroImage) URL.revokeObjectURL(heroImage.src)
      galleryImages.forEach((image) => URL.revokeObjectURL(image.src))
      if (previousMusicUrl.current && !musicTrack.isDefault) {
        URL.revokeObjectURL(previousMusicUrl.current)
      }
    }
  }, [galleryImages, heroImage, musicTrack.isDefault])

  useEffect(() => {
    let cancelled = false

    const hydrateFromStorage = async () => {
      const snapshot = await loadSnapshot()
      if (!snapshot) {
        hasHydratedRef.current = true
        return
      }

      try {
        if (!cancelled) {
          setDetails(snapshot.details)
          setCoordinates(snapshot.coordinates)
          setLocationQuery(snapshot.locationQuery)
        }

        let restoredHero: UploadedImage | null = null
        if (snapshot.heroImage) {
          const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') ?? ''
          const serverUrl = `${API_BASE}/uploads/${snapshot.heroImage.id}`

          restoredHero = {
            id: snapshot.heroImage.id,
            name: snapshot.heroImage.name,
            src: serverUrl,
            file: undefined,
          }
        }
        if (!cancelled && restoredHero) {
          setHeroImage(restoredHero)
        }

        if (snapshot.galleryImages?.length) {
          const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') ?? ''
          const restoredGallery: UploadedImage[] = snapshot.galleryImages.map((meta) => ({
            id: meta.id,
            name: meta.name,
            src: `${API_BASE}/uploads/${meta.id}`,
            file: undefined,
          }))

          if (!cancelled) {
            setGalleryImages(restoredGallery)
          }
        }

        let nextTrack: MusicTrack = { ...DEFAULT_TRACK }
        const musicMeta = snapshot.music

        if (musicMeta?.mode === 'preset') {
          const preset = PRESET_TRACKS.find((item) => item.id === musicMeta.id)
          nextTrack = preset ? { ...preset } : { ...DEFAULT_TRACK }
          previousMusicUrl.current = null
        } else if (musicMeta?.mode === 'custom') {
          const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') ?? ''
          const serverUrl = `${API_BASE}/uploads/${musicMeta.id}`

          nextTrack = {
            id: musicMeta.id,
            name: musicMeta.name,
            src: serverUrl,
            isDefault: false,
            credit: musicMeta.credit,
            file: undefined,
          }
          previousMusicUrl.current = null
        }

        if (!cancelled) {
          setMusicTrack(nextTrack)
          if (typeof snapshot.volume === 'number' && Number.isFinite(snapshot.volume)) {
            const clamped = Math.min(Math.max(snapshot.volume, 0), 1)
            setVolume(clamped)
          }
        }
      } catch (error) {
        console.error('恢复本地数据失败', error)
      } finally {
        if (!cancelled) {
          hasHydratedRef.current = true
        }
      }
    }

    hydrateFromStorage()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume
    }
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    audio.currentTime = 0
    audio.load()

    if (isMusicPlaying) {
      audio
        .play()
        .then(() => {
          setMusicError(null)
        })
        .catch(() => {
          setIsMusicPlaying(false)
          setMusicError('浏览器阻止了自动播放，请点击播放按钮。')
        })
    }
  }, [musicTrack, isMusicPlaying])

  const handleDetailChange = (key: keyof InvitationDetails) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    setDetails((prev) => ({ ...prev, [key]: value }))
  }

  const handleScheduleChange = (index: number, field: keyof ScheduleItem, value: string) => {
    setDetails((prev) => ({
      ...prev,
      schedule: prev.schedule.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }))
  }

  const onDropHero = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return
    const file = acceptedFiles[0]
    const tempId = createId()
    const tempSrc = URL.createObjectURL(file)

    // 立即显示预览
    setHeroImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.src)
      return {
        id: tempId,
        name: file.name,
        src: tempSrc,
        file,
        uploading: true,
      }
    })

    // 立即上传到服务器
    try {
      await upsertAsset(tempId, file)
      const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') ?? ''
      const serverUrl = `${API_BASE}/uploads/${tempId}`

      // 验证文件是否真实存储成功
      try {
        const verifyResponse = await fetch(serverUrl, { method: 'HEAD' })
        if (!verifyResponse.ok) {
          throw new Error('文件验证失败')
        }
      } catch (verifyError) {
        console.error('文件验证失败', verifyError)
        throw new Error('上传后验证失败，请重试')
      }

      // 上传并验证成功，更新为服务器URL
      setHeroImage((prev) => {
        if (prev?.id === tempId) {
          URL.revokeObjectURL(tempSrc)
          return {
            ...prev,
            src: serverUrl,
            uploading: false,
            uploaded: true,
          }
        }
        return prev
      })
    } catch (error) {
      console.error('上传封面图失败', error)
      // 上传失败，保持本地预览但标记错误
      setHeroImage((prev) => {
        if (prev?.id === tempId) {
          return {
            ...prev,
            uploading: false,
            error: error instanceof Error ? error.message : '上传失败，请重试',
          }
        }
        return prev
      })
    }
  }, [])

  const onDropGallery = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return

    const filesToUpload = acceptedFiles.slice(0, 6).map((file) => ({
      id: createId(),
      name: file.name,
      src: URL.createObjectURL(file),
      file,
      uploading: true,
    }))

    // 立即显示预览
    setGalleryImages((prev) => {
      const next = [...prev, ...filesToUpload].slice(0, 6)
      return next
    })

    // 并发上传所有图片
    const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') ?? ''

    await Promise.allSettled(
      filesToUpload.map(async (item) => {
        try {
          await upsertAsset(item.id, item.file)
          const serverUrl = `${API_BASE}/uploads/${item.id}`

          // 验证文件是否真实存储成功
          try {
            const verifyResponse = await fetch(serverUrl, { method: 'HEAD' })
            if (!verifyResponse.ok) {
              throw new Error('验证失败')
            }
          } catch (verifyError) {
            console.error('文件验证失败', verifyError)
            throw new Error('验证失败')
          }

          // 上传并验证成功，更新为服务器URL
          setGalleryImages((prev) =>
            prev.map((img) => {
              if (img.id === item.id) {
                URL.revokeObjectURL(item.src)
                return {
                  ...img,
                  src: serverUrl,
                  uploading: false,
                  uploaded: true,
                }
              }
              return img
            }),
          )
        } catch (error) {
          console.error(`上传图片 ${item.name} 失败`, error)
          // 上传失败，标记错误
          setGalleryImages((prev) =>
            prev.map((img) => {
              if (img.id === item.id) {
                return {
                  ...img,
                  uploading: false,
                  error: error instanceof Error ? error.message : '上传失败',
                }
              }
              return img
            }),
          )
        }
      }),
    )
  }, [])

  const removeGalleryImage = (id: string) => {
    setGalleryImages((prev) => {
      const target = prev.find((image) => image.id === id)
      if (target) URL.revokeObjectURL(target.src)
      return prev.filter((image) => image.id !== id)
    })
  }

  const resetHeroImage = () => {
    setHeroImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.src)
      return null
    })
  }

  const { getRootProps: getHeroRootProps, getInputProps: getHeroInputProps, isDragActive: isHeroDragActive } = useDropzone({
    onDrop: onDropHero,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
    },
    multiple: false,
  })

  const {
    getRootProps: getGalleryRootProps,
    getInputProps: getGalleryInputProps,
    isDragActive: isGalleryDragActive,
  } = useDropzone({
    onDrop: onDropGallery,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
    },
    multiple: true,
    maxFiles: 6,
  })

  const handleLocationSearch = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const keyword = locationQuery.trim()
      if (!keyword) return

      const apiKey = AMAP_KEY
      if (!apiKey) {
        setLocationError('请先在环境变量中配置 VITE_AMAP_KEY，才能使用地点搜索。')
        return
      }

      try {
        setIsSearching(true)
        setLocationError(null)
        setLocationResults([])

        const params = new URLSearchParams({
          key: apiKey,
          keywords: keyword,
          offset: '5',
          page: '1',
          extensions: 'base',
        })
        const response = await fetch(`https://restapi.amap.com/v3/place/text?${params.toString()}`)

        if (!response.ok) {
          throw new Error('位置搜索失败，请稍后再试。')
        }

        const payload: {
          status?: string
          info?: string
          pois?: Array<{
            id?: string
            name?: string
            adcode?: string
            location?: string
            address?: string
            adname?: string
            cityname?: string
            pname?: string
          }>
        } = await response.json()

        if (payload.status !== '1' || !payload.pois || payload.pois.length === 0) {
          setLocationError('没有找到匹配的地点，请尝试更精确的关键字。')
          return
        }

        const parsed: LocationResult[] = payload.pois
          .map((poi) => {
            if (!poi.location) return null
            const [lngString, latString] = poi.location.split(',')
            const lng = Number.parseFloat(lngString)
            const lat = Number.parseFloat(latString)
            if (Number.isNaN(lat) || Number.isNaN(lng)) return null
            const addressParts = [poi.pname, poi.cityname, poi.adname, poi.address].filter(Boolean)
            const formattedAddress = addressParts.join(' ').trim()
            return {
              id: poi.id || poi.adcode || `${lng},${lat}`,
              name: poi.name || keyword,
              address: formattedAddress || poi.name || keyword,
              location: { lat, lng },
            }
          })
          .filter((item): item is LocationResult => Boolean(item))

        if (!parsed.length) {
          setLocationError('没有找到匹配的地点，请尝试输入更具体的信息。')
          return
        }

        setLocationResults(parsed)
      } catch (error) {
        setLocationError(error instanceof Error ? error.message : '网络异常，请稍后再试。')
      } finally {
        setIsSearching(false)
      }
    },
    [locationQuery],
  )

  const applyLocation = (result: LocationResult) => {
    const { location: nextCoordinates, name, address } = result

    if (Number.isNaN(nextCoordinates.lat) || Number.isNaN(nextCoordinates.lng)) {
      setLocationError('所选地点坐标无效。')
      return
    }

    setCoordinates(nextCoordinates)
    setDetails((prev) => ({
      ...prev,
      venue: name || prev.venue,
      address: address || prev.address,
    }))
    if (name) {
      setLocationQuery(name)
    }
    setLocationResults([])
  }

  const handleMapSelect = useCallback(
    (next: Coordinates, resolvedAddress?: string) => {
      setCoordinates(next)
      setLocationError(null)
      setLocationResults([])

      if (resolvedAddress) {
        setDetails((prev) => ({
          ...prev,
          address: resolvedAddress,
        }))
        setLocationQuery(resolvedAddress)
      }
    },
    [],
  )

  const persistState = useCallback(async () => {
    if (!hasHydratedRef.current) return

    setIsSaving(true)
    try {
      const keepIds = new Set<string>()
      let heroMeta: StoredImageMeta | undefined

      // 封面图已经在上传时保存，只需记录元数据
      if (heroImage && heroImage.uploaded) {
        keepIds.add(heroImage.id)
        heroMeta = {
          id: heroImage.id,
          name: heroImage.name,
          type: heroImage.file?.type,
        }
      }

      // 相册图片已经在上传时保存，只需记录元数据
      const galleryMetas: StoredImageMeta[] = galleryImages
        .filter((img) => img.uploaded)
        .map((image) => {
          keepIds.add(image.id)
          return {
            id: image.id,
            name: image.name,
            type: image.file?.type,
          }
        })

      let musicMeta: StoredMusicMeta
      const isPresetTrack = PRESET_TRACKS.some((preset) => preset.id === musicTrack.id)

      if (isPresetTrack) {
        musicMeta = {
          mode: 'preset',
          id: musicTrack.id,
          name: musicTrack.name,
          credit: musicTrack.credit,
          src: musicTrack.src,
        }
      } else {
        keepIds.add(musicTrack.id)
        musicMeta = {
          mode: 'custom',
          id: musicTrack.id,
          name: musicTrack.name,
          credit: musicTrack.credit,
          src: musicTrack.src,
          type: musicTrack.file?.type,
        }
      }

      const snapshot: StoredState = {
        details,
        coordinates,
        locationQuery,
        heroImage: heroMeta,
        galleryImages: galleryMetas,
        music: musicMeta,
        volume,
      }

      await saveSnapshot(snapshot)
      await removeUnusedAssets(keepIds)
    } catch (error) {
      console.error('保存失败', error)
    } finally {
      setIsSaving(false)
    }
  }, [coordinates, details, galleryImages, heroImage, locationQuery, musicTrack, volume])

  useEffect(() => {
    if (!hasHydratedRef.current) return

    const timer = window.setTimeout(() => {
      void persistState()
    }, 300)

    saveTimerRef.current = timer

    return () => {
      window.clearTimeout(timer)
      if (saveTimerRef.current === timer) {
        saveTimerRef.current = null
      }
    }
  }, [persistState])

  const selectPresetTrack = (trackId: string) => {
    const selected = PRESET_TRACKS.find((item) => item.id === trackId)
    if (!selected) return

    if (previousMusicUrl.current) {
      URL.revokeObjectURL(previousMusicUrl.current)
      previousMusicUrl.current = null
    }

    setMusicTrack({ ...selected, file: undefined })
    setIsMusicPlaying(false)
    setMusicError(null)
  }

  const handleMusicUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (previousMusicUrl.current && !musicTrack.isDefault) {
      URL.revokeObjectURL(previousMusicUrl.current)
    }

    const src = URL.createObjectURL(file)
    previousMusicUrl.current = src
    setMusicTrack({
      id: createId(),
      name: file.name,
      src,
      isDefault: false,
      credit: '自定义上传',
      file,
    })
    setIsMusicPlaying(false)
    setMusicError(null)
  }

  const resetMusic = () => {
    if (previousMusicUrl.current) {
      URL.revokeObjectURL(previousMusicUrl.current)
      previousMusicUrl.current = null
    }

    selectPresetTrack(DEFAULT_TRACK.id)
  }

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMusicPlaying) {
      audio.pause()
      setIsMusicPlaying(false)
    } else {
      audio
        .play()
        .then(() => {
          setMusicError(null)
          setIsMusicPlaying(true)
        })
        .catch(() => {
          setMusicError('浏览器阻止了自动播放，请允许音频或调整浏览器设置。')
          setIsMusicPlaying(false)
        })
    }
  }

  const previewDate = useMemo(() => formatDate(details.eventDate), [details.eventDate])
  const previewTime = useMemo(() => formatTime(details.eventTime), [details.eventTime])
  const mapHeight = isDesktop ? 320 : 240

  const goToPreview = () => {
    if (!isPreviewPage) {
      navigate('/')
    }
  }

  const goToEditor = () => {
    if (isPreviewPage) {
      navigate('/edit')
    }
  }

  return (
    <div className="relative min-h-screen pb-24 sm:pb-16">
      <div className="absolute inset-0 -z-10 bg-hero-texture opacity-80" />

      {isSaving && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-blush-500 to-sage-500 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          保存中...
        </motion.div>
      )}

      <motion.header
        className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 sm:pt-14"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center gap-3 rounded-full bg-white/70 px-4 py-2 shadow-md backdrop-blur sm:px-5">
          <Heart className="h-5 w-5 text-blush-500" />
          <p className="text-sm font-medium tracking-tight text-sage-700 sm:text-base">LinkWed · 婚礼邀请匠心体验</p>
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          {isPreviewPage ? '一封可随时分享的数字婚礼请柬' : '实时编辑 · 即刻呈现'}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600 sm:mt-4 sm:text-lg">
          {isPreviewPage
            ? '上传照片、定位场地、挑选音乐，在一个页面完成婚礼请柬设计。'
            : '文案、日程、相册与音乐都会即时更新至预览，无需额外保存。'}
        </p>
      </motion.header>

      <main className="mx-auto mt-8 w-full max-w-5xl px-4 sm:mt-12 sm:px-6">
        {isPreviewPage ? (
          <motion.section
            className="space-y-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative overflow-hidden rounded-3xl">
              {heroImage ? (
                <img src={heroImage.src} alt={heroImage.name} className="h-80 w-full object-cover sm:h-[420px]" />
              ) : (
                <div className="flex h-80 flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white sm:h-[420px]">
                  <Upload className="h-10 w-10" />
                  <p className="text-sm font-medium">上传一张浪漫照片以点亮邀请函</p>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-6 text-white sm:p-8">
                <p className="text-sm uppercase tracking-[0.35em] text-white/75">{previewDate}</p>
                <h2 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{details.coupleNames}</h2>
                <p className="mt-3 max-w-xl text-base text-white/80 sm:text-lg">{details.tagline}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-5 bg-white/90 p-6 rounded-2xl">
                <div className="flex items-center gap-3 bg-slate-50/50 p-4 rounded-xl">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blush-500 to-sage-500 text-white shadow">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">婚礼日期</p>
                    <p className="text-base font-semibold text-slate-900">{previewDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50/50 p-4 rounded-xl">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sage-500 to-slate-700 text-white shadow">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">仪式时间</p>
                    <p className="text-base font-semibold text-slate-900">{previewTime}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-50/50 p-4 rounded-xl">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow">
                    <LocateFixed className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">仪式地点</p>
                    <p className="text-base font-semibold text-slate-900">{details.venue}</p>
                    <p className="text-sm text-slate-600">{details.address}</p>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-xl text-center">
                  <p className="text-base font-semibold text-slate-900">{details.hashtag}</p>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">欢迎用话题标签记录瞬间</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="overflow-hidden rounded-2xl bg-white/90">
                  <div className="flex items-center justify-between px-6 py-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">背景音乐</h3>
                      <p className="text-xs text-slate-500">{musicTrack.name}</p>
                      {musicTrack.credit && <p className="text-[11px] text-slate-400">{musicTrack.credit}</p>}
                      {musicError && <p className="text-xs text-red-500">{musicError}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={togglePlayback}
                      className={clsx(
                        'inline-flex h-11 w-11 items-center justify-center bg-gradient-to-br from-blush-500 to-sage-500 text-white shadow-lg transition hover:opacity-90',
                        isMusicPlaying && 'ring-2 ring-offset-2 ring-offset-white/0 ring-sage-300',
                      )}
                    >
                      {isMusicPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                      {volume === 0 ? <VolumeX className="h-4 w-4 text-slate-500" /> : <Volume2 className="h-4 w-4 text-slate-500" />}
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={(event) => setVolume(Number(event.target.value))}
                        className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-slate-200 accent-blush-500"
                      />
                    </div>
                    <span className="text-xs text-slate-500">循环播放</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/90 p-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-sage-500" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">会场地图</h3>
                      <p className="text-xs text-slate-500">{details.venue} · {details.address}</p>
                    </div>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl">
                    <Suspense
                      fallback={
                        <div
                          style={{ height: mapHeight }}
                          className="flex items-center justify-center bg-slate-100 text-sm text-slate-500"
                        >
                          地图加载中...
                        </div>
                      }
                    >
                      <InvitationMap coordinates={coordinates} venue={details.venue} address={details.address} height={mapHeight} />
                    </Suspense>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 bg-white/90 p-6 rounded-2xl">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 sm:text-base">当日流程</h3>
                <ul className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
                  {details.schedule.map((item) => (
                    <li key={`${item.time}-${item.label}`} className="bg-slate-50/50 p-4 rounded-xl">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-sage-500 sm:text-xs">{item.time}</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500 sm:text-sm">{item.description}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {galleryImages.length > 0 && (
                <div className="space-y-12">
                  {galleryImages.map((image, index) => {
                    const isEven = index % 2 === 0
                    return (
                      <motion.div
                        key={image.id}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        className={clsx(
                          'grid grid-cols-1 gap-8 items-center',
                          isDesktop && 'lg:grid-cols-[1.4fr_1fr]',
                          isEven ? '' : 'lg:grid-cols-[1fr_1.4fr]',
                        )}
                      >
                        <motion.div
                          className={clsx('relative overflow-hidden rounded-2xl', isEven ? 'lg:order-1' : 'lg:order-2')}
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="aspect-[16/10] relative">
                            <img
                              src={image.src}
                              alt={image.name}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                          </div>
                        </motion.div>

                        <motion.div
                          className={clsx(
                            'space-y-4 p-4 sm:p-6',
                            isEven ? 'lg:order-2 lg:text-left' : 'lg:order-1 lg:text-right',
                          )}
                          initial={{ opacity: 0, x: isEven ? 40 : -40 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                        >
                          <div className={clsx('inline-block', !isEven && isDesktop && 'lg:float-right')}>
                            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blush-500/20 to-sage-500/20 px-4 py-2">
                              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blush-500 to-sage-500" />
                              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                                {index === 0 && '初见'}
                                {index === 1 && '相识'}
                                {index === 2 && '相知'}
                                {index === 3 && '相守'}
                                {index === 4 && '相伴'}
                                {index === 5 && '永恒'}
                              </span>
                            </div>
                          </div>
                          {details.story && index === 0 && (
                            <div className="space-y-3">
                              <h3 className={clsx('flex items-center gap-2 text-lg font-semibold text-slate-900 sm:text-xl', !isEven && isDesktop && 'lg:justify-end')}>
                                <Wand2 className="h-5 w-5 text-sage-600" />
                                <span>我们的故事</span>
                              </h3>
                              <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                                {details.story}
                              </p>
                            </div>
                          )}
                          {index > 0 && (
                            <p className="text-sm leading-relaxed text-slate-600 sm:text-base italic">
                              {index === 1 && '从陌生到熟悉，每一次相遇都是命运最好的安排。'}
                              {index === 2 && '时光静好，与君共度。那些平凡的日子里，藏着最真挚的情感。'}
                              {index === 3 && '携手同行，共赴未来。愿我们的爱如这美景，永恒而美好。'}
                              {index === 4 && '在彼此的陪伴中，找到了生命中最温暖的港湾。'}
                              {index === 5 && '承诺一生，不负相遇。让我们在爱的见证下，开启新的篇章。'}
                            </p>
                          )}
                        </motion.div>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              <div className="bg-white/90 p-6 rounded-2xl text-center">
                <p className="text-sm font-medium text-slate-900 sm:text-base">{details.customMessage}</p>
                <a
                  href={details.rsvpLink}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blush-500 to-sage-500 px-5 py-3 text-sm font-medium text-white shadow-lg transition hover:opacity-95 sm:px-6"
                >
                  点击回复 · 期待与您欢聚
                </a>
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.section
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <section className="space-y-5">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">基本信息</h2>
              <p className="text-xs text-slate-500 sm:text-sm">这里的内容修改后将实时同步至预览。</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  新人姓名
                  <input
                    value={details.coupleNames}
                    onChange={handleDetailChange('coupleNames')}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-blush-300 focus:outline-none focus:ring-2 focus:ring-blush-200"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  邀请短句
                  <input
                    value={details.tagline}
                    onChange={handleDetailChange('tagline')}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-200"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  婚礼日期
                  <input
                    type="date"
                    value={details.eventDate}
                    onChange={handleDetailChange('eventDate')}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-blush-300 focus:outline-none focus:ring-2 focus:ring-blush-200"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  仪式时间
                  <input
                    type="time"
                    value={details.eventTime}
                    onChange={handleDetailChange('eventTime')}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-200"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  场地名称
                  <input
                    value={details.venue}
                    onChange={handleDetailChange('venue')}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-blush-300 focus:outline-none focus:ring-2 focus:ring-blush-200"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  详细地址
                  <input
                    value={details.address}
                    onChange={handleDetailChange('address')}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-200"
                  />
                </label>
              </div>

              <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                我们的故事
                <textarea
                  rows={4}
                  value={details.story}
                  onChange={handleDetailChange('story')}
                  className="mt-1 w-full rounded-3xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-blush-300 focus:outline-none focus:ring-2 focus:ring-blush-200"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  回复方式（链接或邮箱）
                  <input
                    value={details.rsvpLink}
                    onChange={handleDetailChange('rsvpLink')}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-200"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  给来宾的话
                  <textarea
                    rows={3}
                    value={details.customMessage}
                    onChange={handleDetailChange('customMessage')}
                    className="mt-1 w-full rounded-3xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-blush-300 focus:outline-none focus:ring-2 focus:ring-blush-200"
                  />
                </label>
              </div>
            </section>

            <section className="bg-white/90 p-4 rounded-2xl">
              <h3 className="text-xs font-semibold text-slate-900 sm:text-sm">当天流程</h3>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">调整时间、环节与备注说明。</p>
              <div className="mt-4 space-y-4">
                {details.schedule.map((item, index) => (
                  <div key={item.label + index} className="bg-slate-50/50 p-3 rounded-xl">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <input
                        value={item.time}
                        onChange={(event) => handleScheduleChange(index, 'time', event.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm focus:border-blush-300 focus:outline-none focus:ring-2 focus:ring-blush-200"
                        placeholder="16:30"
                      />
                      <input
                        value={item.label}
                        onChange={(event) => handleScheduleChange(index, 'label', event.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm focus:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-200"
                        placeholder="环节"
                      />
                      <input
                        value={item.description}
                        onChange={(event) => handleScheduleChange(index, 'description', event.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm focus:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-200"
                        placeholder="备注"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4 bg-white/90 p-4 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-900">封面照片</h3>
              <div
                {...getHeroRootProps({ className: 'relative flex h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center transition hover:border-blush-300 sm:h-64' })}
              >
                <input {...getHeroInputProps()} />
                <ImagePlus className="h-6 w-6 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">{isHeroDragActive ? '松开即可上传封面照片' : '拖拽或点击上传封面照片'}</p>
                <p className="text-xs text-slate-500">推荐尺寸 1600x900，支持 JPG / PNG / WebP</p>
              </div>
              {heroImage && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 relative">
                  <img src={heroImage.src} alt={heroImage.name} className="h-40 w-full object-cover sm:h-56" />
                  {heroImage.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-white text-sm font-medium">上传中...</div>
                    </div>
                  )}
                  {heroImage.error && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      {heroImage.error}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={resetHeroImage}
                    className="flex w-full items-center justify-center gap-2 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:text-blush-500"
                  >
                    移除封面
                  </button>
                </div>
              )}
            </section>

            <section className="space-y-4 bg-white/90 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">相册照片</h3>
                <p className="text-xs text-slate-500">最多 6 张，支持拖拽上传</p>
              </div>
              <div
                {...getGalleryRootProps({ className: 'flex min-h-[140px] cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center transition hover:border-sage-300' })}
              >
                <input {...getGalleryInputProps()} />
                <ImagePlus className="h-5 w-5 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">
                  {isGalleryDragActive ? '松开即可添加照片' : '选择或拖拽多张照片，创造专属回忆画廊'}
                </p>
              </div>
              {galleryImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {galleryImages.map((image) => (
                    <figure key={image.id} className="group relative overflow-hidden rounded-xl">
                      <img src={image.src} alt={image.name} className="h-24 w-full object-cover sm:h-28" />
                      {image.uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="text-white text-xs font-medium">上传中</div>
                        </div>
                      )}
                      {image.error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-500/80">
                          <div className="text-white text-xs font-medium">{image.error}</div>
                        </div>
                      )}
                      {!image.uploading && !image.error && (
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(image.id)}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
                        >
                          移除
                        </button>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4 bg-white/90 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">会场位置</h3>
                <p className="text-xs text-slate-500">搜索并选择会场地址</p>
              </div>
              <form onSubmit={handleLocationSearch} className="space-y-3">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <MapPin className="h-4 w-4 text-sage-500" />
                  <input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder="输入地点关键字"
                    className="flex-1 border-none bg-transparent text-sm focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-gradient-to-r from-blush-500 to-sage-500 px-4 py-2 text-xs font-semibold text-white shadow"
                  >
                    搜索
                  </button>
                </label>
              </form>
              {isSearching && <p className="text-xs text-slate-500">正在搜索...</p>}
              {locationError && <p className="text-xs text-red-500">{locationError}</p>}
              {locationResults.length > 0 && (
                <ul className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  {locationResults.map((result) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        onClick={() => applyLocation(result)}
                        className="w-full rounded-2xl px-3 py-2 text-left transition hover:bg-slate-100"
                      >
                        <p className="font-medium text-slate-900">{result.name}</p>
                        <p className="text-xs text-slate-500">{result.address}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Suspense fallback={<div className="flex h-56 items-center justify-center bg-slate-100 text-sm text-slate-500">地图加载中...</div>}>
                  <InvitationMap
                    coordinates={coordinates}
                    venue={details.venue}
                    address={details.address}
                    height={240}
                    interactive
                    onSelect={handleMapSelect}
                  />
                </Suspense>
              </div>
            </section>

            <section className="space-y-4 bg-white/90 p-4 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-900">背景音乐</h3>
              <p className="text-xs text-slate-500">设置典礼氛围音乐，可自定义上传。</p>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">内置曲目</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PRESET_TRACKS.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => selectPresetTrack(track.id)}
                      className={clsx(
                        'flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition hover:border-blush-300 hover:bg-white/90',
                        musicTrack.id === track.id ? 'border-blush-400 bg-white shadow' : 'border-slate-200 bg-white/70',
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{track.name}</p>
                        {track.credit && <p className="text-[11px] text-slate-500">{track.credit}</p>}
                      </div>
                      <div
                        className={clsx(
                          'h-4 w-4 rounded-full border',
                          musicTrack.id === track.id
                            ? 'border-blush-400 bg-gradient-to-br from-blush-500 to-sage-500'
                            : 'border-slate-300 bg-white',
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-2xl bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{musicTrack.name}</p>
                  <p className="text-xs text-slate-500">
                    {musicTrack.credit ?? (musicTrack.isDefault ? '默认浪漫音色 · 18s 循环' : '自定义音频')}
                  </p>
                  {musicError && <p className="mt-1 text-xs text-red-500">{musicError}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlayback}
                    className={clsx(
                      'inline-flex h-10 w-10 items-center justify-center bg-gradient-to-br from-blush-500 to-sage-500 text-white shadow-lg transition hover:opacity-90',
                      isMusicPlaying && 'ring-2 ring-offset-2 ring-offset-white/0 ring-sage-300',
                    )}
                  >
                    {isMusicPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <label className="flex items-center gap-2">
                    {volume === 0 ? <VolumeX className="h-4 w-4 text-slate-500" /> : <Volume2 className="h-4 w-4 text-slate-500" />}
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={(event) => setVolume(Number(event.target.value))}
                      className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-slate-200 accent-blush-500"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blush-300 hover:text-blush-500">
                  <Music2 className="h-4 w-4" />
                  上传音频
                  <input type="file" accept="audio/*" onChange={handleMusicUpload} className="hidden" />
                </label>
                {!musicTrack.isDefault && (
                  <button
                    type="button"
                    onClick={resetMusic}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-sage-600"
                  >
                    恢复默认
                  </button>
                )}
              </div>
            </section>
          </motion.section>
        )}
      </main>

      <audio
        ref={audioRef}
        src={musicTrack.src}
        loop
        preload="auto"
        className="hidden"
        onEnded={() => setIsMusicPlaying(false)}
      />

      <div className="fixed inset-x-0 bottom-4 px-4 sm:bottom-6">
        <div className="mx-auto flex max-w-md items-center justify-between rounded-full bg-white/90 px-4 py-3 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={goToPreview}
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 text-xs font-semibold transition sm:text-sm',
              isPreviewPage ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <Eye className="h-4 w-4" />
            邀请函预览
          </button>
          <span className="h-6 w-px bg-slate-200" />
          <button
            type="button"
            onClick={togglePlayback}
            className={clsx(
              'flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm',
              isMusicPlaying ? 'bg-gradient-to-r from-blush-500 to-sage-500 text-white shadow' : 'bg-white text-slate-600 shadow-inner',
            )}
          >
            {isMusicPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            音乐
          </button>
          <span className="h-6 w-px bg-slate-200" />
          <button
            type="button"
            onClick={goToEditor}
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 text-xs font-semibold transition sm:text-sm',
              !isPreviewPage ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <Wand2 className="h-4 w-4" />
            内容编辑
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
