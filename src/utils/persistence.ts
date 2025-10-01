import type { Coordinates, InvitationDetails } from '../types/invitation'
import { fetchInvitation, saveInvitation, uploadAsset, type ServerInvitation } from '../api/invitation'

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') ?? ''

const assetUrl = (id: string) => `${API_BASE}/uploads/${id}`

export interface StoredImageMeta {
  id: string
  name: string
  type?: string
}

export interface StoredMusicMeta {
  mode: 'preset' | 'custom'
  id: string
  name: string
  credit?: string
  type?: string
  src?: string
}

export interface StoredState {
  details: InvitationDetails
  coordinates: Coordinates
  locationQuery: string
  heroImage?: StoredImageMeta
  galleryImages: StoredImageMeta[]
  music: StoredMusicMeta
  volume: number
}

export const saveSnapshot = async (state: StoredState) => {
  try {
    const payload: ServerInvitation = {
      details: state.details,
      coordinates: state.coordinates,
      locationQuery: state.locationQuery,
      heroImage: state.heroImage
        ? {
            id: state.heroImage.id,
            name: state.heroImage.name,
            url: assetUrl(state.heroImage.id),
            type: state.heroImage.type,
          }
        : null,
      galleryImages: state.galleryImages.map((meta) => ({
        id: meta.id,
        name: meta.name,
        url: assetUrl(meta.id),
        type: meta.type,
      })),
      music:
        state.music.mode === 'preset'
          ? {
              id: state.music.id,
              name: state.music.name,
              src: state.music.src ?? '',
              isDefault: true,
              credit: state.music.credit,
            }
          : {
              id: state.music.id,
              name: state.music.name,
              src: assetUrl(state.music.id),
              isDefault: false,
              credit: state.music.credit,
            },
      volume: state.volume,
    }

    await saveInvitation(payload)
  } catch (error) {
    console.error('保存邀请数据失败', error)
  }
}

export const loadSnapshot = async (): Promise<StoredState | null> => {
  try {
    const snapshot = await fetchInvitation()
    const details = snapshot.details as InvitationDetails | undefined
    const coordinates = snapshot.coordinates as Coordinates | undefined

    return {
      details: details ?? ({} as InvitationDetails),
      coordinates: coordinates ?? ({ lat: 0, lng: 0 } as Coordinates),
      locationQuery: snapshot.locationQuery ?? '',
      heroImage: snapshot.heroImage
        ? {
            id: snapshot.heroImage.id,
            name: snapshot.heroImage.name,
            type: snapshot.heroImage.type,
          }
        : undefined,
      galleryImages: Array.isArray(snapshot.galleryImages)
        ? snapshot.galleryImages.map((asset) => ({
            id: asset.id,
            name: asset.name,
            type: asset.type,
          }))
        : [],
      music: snapshot.music
        ? {
            mode: snapshot.music.isDefault ? 'preset' : 'custom',
            id: snapshot.music.id,
            name: snapshot.music.name,
            credit: snapshot.music.credit,
            type: (snapshot.music as any).type,
            src: snapshot.music.src,
          }
        : {
            mode: 'preset',
            id: 'default',
            name: '浪漫花海（默认循环）',
            credit: 'LinkWed 内置音频循环',
            src: '/media/background.wav',
          },
      volume: typeof snapshot.volume === 'number' ? snapshot.volume : 0.6,
    }
  } catch (error) {
    console.error('读取邀请数据失败', error)
    return null
  }
}

export const clearSnapshot = () => {
  // no-op for server persistence
}

export const upsertAsset = async (id: string, blob: Blob) => {
  try {
    const file = blob instanceof File ? blob : new File([blob], id, { type: blob.type || 'application/octet-stream' })
    const kind: 'image' | 'audio' = (file.type || '').startsWith('audio') ? 'audio' : 'image'
    await uploadAsset(file, kind, id)
  } catch (error) {
    console.error('上传资源失败', error)
  }
}

export const fetchAsset = async (id: string): Promise<Blob | undefined> => {
  try {
    const response = await fetch(assetUrl(id))
    if (!response.ok) return undefined
    return await response.blob()
  } catch (error) {
    console.error('读取资源失败', error)
    return undefined
  }
}

export const removeUnusedAssets = async (_keepIds: Iterable<string>) => {
  // no-op;服务端暂不清理历史资源
}
