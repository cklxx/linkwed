import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, RefObject } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
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

const InvitationMap = lazy(() => import('./components/InvitationMap'))

interface ScheduleItem {
  time: string
  label: string
  description: string
}

interface InvitationDetails {
  coupleNames: string
  tagline: string
  eventDate: string
  eventTime: string
  venue: string
  address: string
  story: string
  hashtag: string
  rsvpLink: string
  customMessage: string
  schedule: ScheduleItem[]
}

interface Coordinates {
  lat: number
  lng: number
}

interface LocationResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface UploadedImage {
  id: string
  name: string
  src: string
}

interface MusicTrack {
  name: string
  src: string
  isDefault: boolean
}

const DEFAULT_DETAILS: InvitationDetails = {
  coupleNames: 'Ava & Noah',
  tagline: 'With hearts intertwined, we invite you to celebrate love',
  eventDate: '2025-10-18',
  eventTime: '16:30',
  venue: 'West Lake Garden Pavilion',
  address: 'Longjing Rd, Xihu, Hangzhou, Zhejiang',
  story:
    'From a serendipitous meeting under autumn leaves to building a life filled with warmth, laughter, and shared dreams — we cannot wait to begin our forever with you by our side.',
  hashtag: '#LinkingHearts2025',
  rsvpLink: 'mailto:rsvp@linkwed.app',
  customMessage: 'Kindly RSVP by September 12, 2025. Reception to follow the ceremony with live music, candlelit dinner, and heartfelt toasts.',
  schedule: [
    {
      time: '16:30',
      label: 'Welcome Garden Gathering',
      description: 'Champagne reception with acoustic melodies in the jasmine courtyard.',
    },
    {
      time: '17:15',
      label: 'Vows by the Lake',
      description: 'A sunset ceremony beneath the willow arches overlooking West Lake.',
    },
    {
      time: '18:30',
      label: 'Moonlit Celebration',
      description: 'Seasonal tasting menu, first dance under lanterns, and stargazing lounge.',
    },
  ],
}

const DEFAULT_COORDINATES: Coordinates = { lat: 30.243056, lng: 120.150833 }

const DEFAULT_TRACK: MusicTrack = {
  name: 'Celestial Bloom',
  src: '/media/background.wav',
  isDefault: true,
}

const formatDate = (input: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date(input))
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
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  } catch (error) {
    return input
  }
}

const scrollToElement = (ref: RefObject<HTMLDivElement | null>) => {
  if (ref.current) {
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function App() {
  const [details, setDetails] = useState<InvitationDetails>(DEFAULT_DETAILS)
  const [heroImage, setHeroImage] = useState<UploadedImage | null>(null)
  const [galleryImages, setGalleryImages] = useState<UploadedImage[]>([])
  const [coordinates, setCoordinates] = useState<Coordinates>(DEFAULT_COORDINATES)
  const [locationQuery, setLocationQuery] = useState('West Lake Garden Pavilion')
  const [locationResults, setLocationResults] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [musicTrack, setMusicTrack] = useState<MusicTrack>(DEFAULT_TRACK)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [musicError, setMusicError] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.6)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(min-width: 1024px)').matches
  })
  const [mobileTab, setMobileTab] = useState<'preview' | 'editor'>('preview')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousMusicUrl = useRef<string | null>(null)
  const invitationRef = useRef<HTMLDivElement | null>(null)
  const mapSectionRef = useRef<HTMLDivElement | null>(null)
  const rsvpRef = useRef<HTMLDivElement | null>(null)

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
    if (isDesktop) {
      setMobileTab('preview')
    }
  }, [isDesktop])

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

  const navigateToSection = useCallback(
    (targetTab: 'preview' | 'editor', target: RefObject<HTMLDivElement | null>) => {
      if (!isDesktop && mobileTab !== targetTab) {
        setMobileTab(targetTab)
        setTimeout(() => scrollToElement(target), 80)
        return
      }
      scrollToElement(target)
    },
    [isDesktop, mobileTab],
  )

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

  const onDropHero = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return
    const file = acceptedFiles[0]
    const src = URL.createObjectURL(file)
    setHeroImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.src)
      return {
        id: crypto.randomUUID(),
        name: file.name,
        src,
      }
    })
  }, [])

  const onDropGallery = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return
    const mapped = acceptedFiles.slice(0, 6).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      src: URL.createObjectURL(file),
    }))
    setGalleryImages((prev) => {
      const next = [...prev, ...mapped].slice(0, 6)
      return next
    })
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
      if (!locationQuery.trim()) return

      try {
        setIsSearching(true)
        setLocationError(null)
        setLocationResults([])

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=5`,
          {
            headers: {
              'User-Agent': 'LinkWed/1.0 (https://linkwed.app)',
            },
          },
        )

        if (!response.ok) {
          throw new Error('位置搜索失败，请稍后再试。')
        }

        const results: LocationResult[] = await response.json()
        if (results.length === 0) {
          setLocationError('没有找到匹配的地点，请尝试更精确的关键字。')
          return
        }
        setLocationResults(results)
      } catch (error) {
        setLocationError(error instanceof Error ? error.message : '网络异常，请稍后再试。')
      } finally {
        setIsSearching(false)
      }
    },
    [locationQuery],
  )

  const applyLocation = (result: LocationResult) => {
    const lat = Number.parseFloat(result.lat)
    const lng = Number.parseFloat(result.lon)

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setLocationError('所选地点坐标无效。')
      return
    }

    const [name, ...rest] = result.display_name.split(', ')
    const address = rest.join(', ')

    setCoordinates({ lat, lng })
    setDetails((prev) => ({
      ...prev,
      venue: name || prev.venue,
      address: address || prev.address,
    }))
    setLocationResults([])
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
      name: file.name,
      src,
      isDefault: false,
    })
    setIsMusicPlaying(false)
    setMusicError(null)
  }

  const resetMusic = () => {
    if (previousMusicUrl.current && !musicTrack.isDefault) {
      URL.revokeObjectURL(previousMusicUrl.current)
      previousMusicUrl.current = null
    }

    setMusicTrack(DEFAULT_TRACK)
    setIsMusicPlaying(false)
    setMusicError(null)
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
  const mapHeight = isDesktop ? 260 : 220
  const previewVisible = isDesktop || mobileTab === 'preview'
  const editorVisible = isDesktop || mobileTab === 'editor'

  return (
    <div className="min-h-screen pb-24 sm:pb-16">
      <div className="absolute inset-0 -z-10 bg-hero-texture opacity-80"></div>
      <motion.header
        className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-14"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center gap-3 rounded-full bg-white/70 px-4 py-2 shadow-md backdrop-blur sm:px-5">
          <Heart className="h-5 w-5 text-blush-500" />
          <p className="text-sm font-medium tracking-tight text-sage-700 sm:text-base">LinkWed · Curated wedding invitation experience</p>
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Craft an unforgettable digital invitation
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600 sm:mt-4 sm:text-lg">
          Upload your memories, pin the perfect venue, and set the mood with bespoke music — all in one canvas designed
          for modern celebrations.
        </p>
      </motion.header>

      {!isDesktop && (
        <div className="mx-auto mt-8 flex w-full max-w-6xl justify-center px-4">
          <div className="flex w-full rounded-full bg-white/60 p-1 shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={clsx(
                'flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
                mobileTab === 'preview' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Eye className="h-4 w-4" />
              预览邀请函
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('editor')}
              className={clsx(
                'flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
                mobileTab === 'editor' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Wand2 className="h-4 w-4" />
              编辑内容
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto mt-8 flex w-full max-w-6xl flex-col gap-10 px-4 sm:mt-12 sm:flex-row sm:gap-12 sm:px-6">
        {previewVisible && (
          <motion.section
            ref={invitationRef}
            className={clsx('w-full', isDesktop && 'lg:w-2/3')}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <div className="rounded-3xl bg-white/80 p-6 shadow-invitation backdrop-blur-lg sm:p-8">
              <div className="overflow-hidden rounded-2xl border border-white/40">
                <div
                  className="relative h-[280px] bg-gradient-to-br from-blush-200/80 via-white to-sage-200/80 sm:h-[360px]"
                  style={{ backgroundImage: heroImage ? `url(${heroImage.src})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  {!heroImage && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/60 via-black/30 to-transparent text-white">
                      <Heart className="h-12 w-12" />
                      <p className="mt-4 font-display text-2xl tracking-[0.35em] sm:text-3xl">TOGETHER</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.4em] sm:text-sm">A celebration of love</p>
                    </div>
                  )}
                </div>

                <div className="grid gap-8 bg-white/95 px-6 py-10 sm:grid-cols-[1.1fr_0.9fr] sm:gap-10 sm:px-10">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-sage-500 sm:text-sm">You are cordially invited to</p>
                    <h2 className="mt-4 font-display text-4xl text-slate-900 sm:mt-5 sm:text-6xl">{details.coupleNames}</h2>
                    <p className="mt-3 text-sm text-slate-500 sm:text-base">{details.tagline}</p>

                    <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
                      <div className="flex items-start gap-3 rounded-xl bg-blush-50/80 p-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blush-500 shadow">
                          <Calendar className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-900 sm:text-sm">Date</p>
                          <p className="text-xs text-slate-600 sm:text-sm">{previewDate}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-xl bg-sage-50/80 p-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sage-600 shadow">
                          <Clock className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-900 sm:text-sm">Time</p>
                          <p className="text-xs text-slate-600 sm:text-sm">{previewTime}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-100 bg-white/90 p-5 sm:mt-8">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base">
                        <MapPin className="h-5 w-5 text-blush-500" /> Our Venue
                      </h3>
                      <p className="mt-2 text-sm font-medium text-slate-800 sm:text-base">{details.venue}</p>
                      <p className="text-xs text-slate-500 sm:text-sm">{details.address}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 sm:text-base">Evening Showcase</h3>
                    <ul className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
                      {details.schedule.map((item) => (
                        <li key={`${item.time}-${item.label}`} className="rounded-2xl bg-white/90 p-4 shadow-sm">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-sage-500 sm:text-xs">{item.time}</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{item.label}</p>
                          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{item.description}</p>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-center sm:mt-6">
                      <p className="text-sm font-medium text-slate-800">{details.hashtag}</p>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 sm:text-xs">Share your captured moments</p>
                    </div>
                  </div>
                </div>

                {details.story && (
                  <div className="space-y-6 bg-white/95 px-6 pb-10 sm:px-10">
                    <div className="rounded-2xl bg-gradient-to-br from-white to-slate-50/80 p-5 sm:p-6">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base">
                        <Wand2 className="h-5 w-5 text-sage-600" /> Our story
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{details.story}</p>
                    </div>
                    {galleryImages.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 sm:text-base">Memory Lane</h3>
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {galleryImages.map((image) => (
                            <figure key={image.id} className="group relative overflow-hidden rounded-xl">
                              <img
                                src={image.src}
                                alt={image.name}
                                className="h-24 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-28"
                              />
                              <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/25" />
                            </figure>
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={rsvpRef} className="rounded-2xl border border-slate-100 bg-white/90 p-6 text-center">
                      <p className="text-sm font-medium text-slate-900 sm:text-base">{details.customMessage}</p>
                      <a
                        href={details.rsvpLink}
                        className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blush-500 to-sage-500 px-5 py-3 text-sm font-medium text-white shadow-lg transition hover:opacity-95 sm:px-6"
                      >
                        RSVP · We cannot wait to celebrate with you
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {editorVisible && (
          <motion.aside
            className={clsx('w-full space-y-8', isDesktop && 'lg:w-1/3')}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <section className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-invitation backdrop-blur sm:p-6">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Personalise the details</h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">Update what guests will see instantly in the live preview.</p>

              <div className="mt-5 space-y-5">
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  Couple names
                  <input
                    value={details.coupleNames}
                    onChange={handleDetailChange('coupleNames')}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-blush-300 focus:outline-none focus:ring-2 focus:ring-blush-200"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  Tagline
                  <input
                    value={details.tagline}
                    onChange={handleDetailChange('tagline')}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-200"
                  />
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                    Date
                    <input
                      type="date"
                      value={details.eventDate}
                      onChange={handleDetailChange('eventDate')}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-blush-300 focus:outline-none focus:ring-2 focus:ring-blush-200"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                    Time
                    <input
                      type="time"
                      value={details.eventTime}
                      onChange={handleDetailChange('eventTime')}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-200"
                    />
                  </label>
                </div>
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  Venue name
                  <input
                    value={details.venue}
                    onChange={handleDetailChange('venue')}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-blush-300 focus:outline-none focus:ring-2 focus:ring-blush-200"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  Address
                  <input
                    value={details.address}
                    onChange={handleDetailChange('address')}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-200"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  Love story
                  <textarea
                    rows={4}
                    value={details.story}
                    onChange={handleDetailChange('story')}
                    className="mt-1 w-full rounded-3xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-blush-300 focus:outline-none focus:ring-2 focus:ring-blush-200"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  RSVP link or email
                  <input
                    value={details.rsvpLink}
                    onChange={handleDetailChange('rsvpLink')}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-200"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700 sm:text-sm">
                  Custom message
                  <textarea
                    rows={3}
                    value={details.customMessage}
                    onChange={handleDetailChange('customMessage')}
                    className="mt-1 w-full rounded-3xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-inner focus:border-blush-300 focus:outline-none focus:ring-2 focus:ring-blush-200"
                  />
                </label>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-4">
                <h3 className="text-xs font-semibold text-slate-900 sm:text-sm">Schedule highlights</h3>
                <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">Edit the flow of your celebration.</p>
                <div className="mt-4 space-y-4">
                  {details.schedule.map((item, index) => (
                    <div key={item.label + index} className="rounded-2xl bg-white/90 p-3 shadow-sm">
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
                          placeholder="Event"
                        />
                        <input
                          value={item.description}
                          onChange={(event) => handleScheduleChange(index, 'description', event.target.value)}
                          className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm focus:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-200"
                          placeholder="Details"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-invitation backdrop-blur sm:p-6">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Photography & memories</h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">Add a hero portrait and gallery snapshots.</p>

              <div className="mt-5 space-y-4">
                <div
                  {...getHeroRootProps()}
                  className={clsx(
                    'group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/70 p-6 transition hover:border-blush-300 hover:bg-blush-50/60 sm:p-8',
                    isHeroDragActive && 'border-blush-400 bg-blush-50/80',
                  )}
                >
                  <input {...getHeroInputProps()} />
                  <Upload className="h-9 w-9 text-blush-400 sm:h-10 sm:w-10" />
                  <p className="mt-3 text-sm font-medium text-slate-800">上传主视觉照片</p>
                  <p className="text-xs text-slate-500">JPG · PNG · WEBP，推荐尺寸 1800×1200</p>
                  {heroImage && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        resetHeroImage()
                      }}
                      className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:text-blush-500"
                    >
                      移除当前照片
                    </button>
                  )}
                </div>

                <div
                  {...getGalleryRootProps()}
                  className={clsx(
                    'cursor-pointer rounded-3xl border-2 border-dashed border-slate-200 bg-white/70 p-5 transition hover:border-sage-300 hover:bg-sage-50/60 sm:p-6',
                    isGalleryDragActive && 'border-sage-400 bg-sage-50/80',
                  )}
                >
                  <input {...getGalleryInputProps()} />
                  <div className="flex items-center gap-3 text-slate-700">
                    <ImagePlus className="h-5 w-5 text-sage-500 sm:h-6 sm:w-6" />
                    <div>
                      <p className="text-sm font-semibold">上传回忆相册</p>
                      <p className="text-xs text-slate-500">最多 6 张，支持拖拽排序（按上传顺序展示）。</p>
                    </div>
                  </div>
                </div>

                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {galleryImages.map((image) => (
                      <div key={image.id} className="group relative overflow-hidden rounded-2xl shadow">
                        <img
                          src={image.src}
                          alt={image.name}
                          className="h-20 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-24"
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(image.id)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100"
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section
              ref={mapSectionRef}
              className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-invitation backdrop-blur sm:p-6"
            >
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Ceremony location</h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">搜索并固定现场位置，地图将实时更新。</p>

              <form onSubmit={handleLocationSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <MapPin className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder="例如：West Lake Garden Pavilion"
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-10 py-3 text-sm focus:border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-200"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sage-500 to-blush-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
                >
                  <LocateFixed className="h-4 w-4" />
                  搜索
                </button>
              </form>

              {locationError && <p className="mt-3 rounded-2xl bg-red-50/90 px-4 py-2 text-sm text-red-600">{locationError}</p>}

              {isSearching && <p className="mt-3 text-sm text-slate-500">正在搜索地点...</p>}

              {locationResults.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {locationResults.map((result) => (
                    <li key={result.place_id}>
                      <button
                        type="button"
                        onClick={() => applyLocation(result)}
                        className="w-full rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-left text-sm text-slate-600 transition hover:border-blush-200 hover:bg-blush-50/70"
                      >
                        {result.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 overflow-hidden rounded-3xl border border-white/50">
                <Suspense
                  fallback={
                    <div className="flex h-[220px] items-center justify-center bg-slate-50/80 text-sm text-slate-400 sm:h-[260px]">
                      正在加载地图…
                    </div>
                  }
                >
                  <InvitationMap coordinates={coordinates} venue={details.venue} address={details.address} height={mapHeight} />
                </Suspense>
              </div>
            </section>

            <section className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-invitation backdrop-blur sm:p-6">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Soundtrack</h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">营造氛围的背景乐，可自定义上传。</p>

              <div className="mt-5 space-y-4">
                <div className="flex flex-col gap-4 rounded-2xl bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{musicTrack.name}</p>
                    <p className="text-xs text-slate-500">{musicTrack.isDefault ? '默认浪漫音色 · 18s 循环' : '自定义音频'}</p>
                    {musicError && <p className="mt-1 text-xs text-red-500">{musicError}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlayback}
                      className={clsx(
                        'inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blush-500 to-sage-500 text-white shadow-lg transition hover:opacity-90',
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
              </div>

              <audio
                ref={audioRef}
                src={musicTrack.src}
                loop
                preload="auto"
                onEnded={() => setIsMusicPlaying(false)}
              />
            </section>
          </motion.aside>
        )}
      </main>

      {!isDesktop && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 flex justify-center px-4 sm:hidden">
          <div className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded-full bg-white/90 px-4 py-3 shadow-xl backdrop-blur">
            <button
              type="button"
              onClick={() => navigateToSection('preview', invitationRef)}
              className="flex flex-1 items-center justify-center gap-2 text-xs font-semibold text-slate-600"
            >
              <Eye className="h-4 w-4" />
              邀请函
            </button>
            <span className="h-6 w-px bg-slate-200" />
            <button
              type="button"
              onClick={togglePlayback}
              className={clsx(
                'flex flex-1 items-center justify-center gap-2 text-xs font-semibold',
                isMusicPlaying ? 'text-blush-500' : 'text-slate-600',
              )}
            >
              {isMusicPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              音乐
            </button>
            <span className="h-6 w-px bg-slate-200" />
            <button
              type="button"
              onClick={() => navigateToSection('editor', mapSectionRef)}
              className="flex flex-1 items-center justify-center gap-2 text-xs font-semibold text-slate-600"
            >
              <MapPin className="h-4 w-4" />
              场地
            </button>
            <span className="h-6 w-px bg-slate-200" />
            <button
              type="button"
              onClick={() => navigateToSection('preview', rsvpRef)}
              className="flex flex-1 items-center justify-center gap-2 text-xs font-semibold text-slate-600"
            >
              <Heart className="h-4 w-4" />
              RSVP
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
