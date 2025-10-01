import { useEffect, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'
import type { Coordinates } from '../types/invitation'
import { AMAP_KEY, AMAP_JS_CODE } from '../config/amap'

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode?: string
    }
  }
}

interface InvitationMapProps {
  coordinates: Coordinates
  venue: string
  address: string
  height: number
  interactive?: boolean
  onSelect?: (next: Coordinates, resolvedAddress?: string) => void
}

const InvitationMap = ({ coordinates, venue, address, height, interactive = false, onSelect }: InvitationMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const clickHandlerRef = useRef<((event: any) => void) | null>(null)
  const selectCallbackRef = useRef(onSelect)
  const [error, setError] = useState<string | null>(null)

  selectCallbackRef.current = onSelect

  useEffect(() => {
    let disposed = false

    const bootstrap = async () => {
      const key = AMAP_KEY
      if (!key) {
        setError('请在环境变量中配置 VITE_AMAP_KEY 以加载高德地图。')
        return
      }

      const securityCode = AMAP_JS_CODE
      if (securityCode) {
        window._AMapSecurityConfig = { securityJsCode: securityCode }
      }

      try {
        const AMap = await AMapLoader.load({
          key,
          version: '2.0',
          plugins: interactive ? ['AMap.Scale', 'AMap.Geocoder'] : ['AMap.Scale'],
        })

        if (disposed || !containerRef.current) return

        const map = new AMap.Map(containerRef.current, {
          zoom: 15,
          center: [coordinates.lng, coordinates.lat],
          viewMode: '3D',
          mapStyle: 'amap://styles/whitesmoke',
        })

        const marker = new AMap.Marker({
          position: [coordinates.lng, coordinates.lat],
          animation: 'AMAP_ANIMATION_DROP',
        })
        marker.setMap(map)
        if (venue || address) {
          marker.setTitle(`${venue}\n${address}`)
        }

        mapRef.current = map
        markerRef.current = marker
        setError(null)

        if (interactive && selectCallbackRef.current) {
          let geocoder: any = null
          AMap.plugin('AMap.Geocoder', () => {
            geocoder = new AMap.Geocoder({})
          })

          const handler = (event: any) => {
            if (!selectCallbackRef.current) return
            const lnglat = event.lnglat
            if (!lnglat) return
            const next: Coordinates = { lat: lnglat.getLat(), lng: lnglat.getLng() }
            marker.setPosition([next.lng, next.lat])
            map.setCenter([next.lng, next.lat])

            if (geocoder) {
              geocoder.getAddress([next.lng, next.lat], (status: string, result: any) => {
                if (status === 'complete' && result?.regeocode) {
                  selectCallbackRef.current?.(next, result.regeocode.formattedAddress as string)
                } else {
                  selectCallbackRef.current?.(next)
                }
              })
            } else {
              selectCallbackRef.current?.(next)
            }
          }

          map.on('click', handler)
          clickHandlerRef.current = handler
          map.setStatus({ doubleClickZoom: false })
        }
      } catch (bootstrapError) {
        console.error(bootstrapError)
        setError('地图加载失败，请检查网络或密钥配置。')
      }
    }

    bootstrap()

    return () => {
      disposed = true
      if (mapRef.current && clickHandlerRef.current) {
        mapRef.current.off('click', clickHandlerRef.current)
      }
      clickHandlerRef.current = null
      markerRef.current?.setMap(null)
      markerRef.current = null
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [interactive])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    const position: [number, number] = [coordinates.lng, coordinates.lat]
    markerRef.current.setPosition(position)
    if (venue || address) {
      markerRef.current.setTitle(`${venue}\n${address}`)
    }
    mapRef.current.setCenter(position)
  }, [coordinates.lat, coordinates.lng, venue, address])

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />
      {interactive && !error && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-[11px] text-slate-600 shadow">
          点击地图可更新坐标
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/95 px-4 text-center text-xs text-slate-500">
          {error}
        </div>
      )}
    </div>
  )
}

export default InvitationMap
