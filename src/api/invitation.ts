import type { InvitationDetails, Coordinates, MusicTrack } from '../types/invitation'

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') ?? ''

const withBase = (path: string) => `${API_BASE}${path}`

type AssetKind = 'image' | 'audio'

export interface ServerAsset {
  id: string
  name: string
  url: string
  type?: string
  size?: number
}

export interface ServerInvitation {
  details?: InvitationDetails
  coordinates?: Coordinates
  locationQuery?: string
  heroImage?: ServerAsset | null
  galleryImages?: ServerAsset[]
  music?: (MusicTrack & { src: string }) | null
  volume?: number
  updatedAt?: string
  isNew?: boolean
}

export const fetchInvitation = async (): Promise<ServerInvitation> => {
  const response = await fetch(withBase('/api/invitation'))
  if (!response.ok) {
    throw new Error('邀请数据请求失败')
  }
  return response.json()
}

export const saveInvitation = async (payload: ServerInvitation): Promise<ServerInvitation> => {
  const response = await fetch(withBase('/api/invitation'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('邀请数据保存失败')
  }
  return response.json()
}

export const uploadAsset = async (file: File, kind: AssetKind, fileId?: string): Promise<ServerAsset> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('kind', kind)
  if (fileId) {
    formData.append('fileId', fileId)
  }

  const response = await fetch(withBase('/api/upload'), {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('文件上传失败')
  }
  return response.json()
}
