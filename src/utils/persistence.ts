import type { Coordinates, InvitationDetails } from '../types/invitation'

const STATE_STORAGE_KEY = 'linkwed-state.v1'
const DB_NAME = 'linkwed-storage'
const DB_VERSION = 1
const ASSET_STORE = 'assets'

const isIndexedDBSupported = typeof indexedDB !== 'undefined'

let databasePromise: Promise<IDBDatabase> | null = null

const getDatabase = () => {
  if (!isIndexedDBSupported) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment.'))
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(ASSET_STORE)) {
          db.createObjectStore(ASSET_STORE)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
    })
  }

  return databasePromise
}

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

interface PersistedPayload {
  version: number
  state: StoredState
}

export const saveSnapshot = (state: StoredState) => {
  try {
    const payload: PersistedPayload = { version: 1, state }
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.error('保存状态到本地失败', error)
  }
}

export const loadSnapshot = (): StoredState | null => {
  try {
    const raw = localStorage.getItem(STATE_STORAGE_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw) as PersistedPayload
    if (typeof payload !== 'object' || payload === null) return null
    if (payload.version !== 1 || typeof payload.state !== 'object' || payload.state === null) {
      return null
    }
    const { state } = payload
    if (!state.galleryImages) state.galleryImages = []
    return state
  } catch (error) {
    console.error('读取本地状态失败', error)
    return null
  }
}

export const clearSnapshot = () => {
  localStorage.removeItem(STATE_STORAGE_KEY)
}

export const upsertAsset = async (id: string, blob: Blob) => {
  if (!isIndexedDBSupported) return
  const db = await getDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, 'readwrite')
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB put failed'))
    transaction.objectStore(ASSET_STORE).put(blob, id)
  })
}

export const fetchAsset = async (id: string): Promise<Blob | undefined> => {
  if (!isIndexedDBSupported) return undefined
  try {
    const db = await getDatabase()
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const transaction = db.transaction(ASSET_STORE, 'readonly')
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB get failed'))
      const request = transaction.objectStore(ASSET_STORE).get(id)
      request.onsuccess = () => resolve(request.result ?? undefined)
      request.onerror = () => reject(request.error ?? new Error('IndexedDB get failed'))
    })
  } catch (error) {
    console.error('读取资源失败', error)
    return undefined
  }
}

export const removeUnusedAssets = async (keepIds: Iterable<string>) => {
  if (!isIndexedDBSupported) return
  try {
    const keep = new Set(keepIds)
    const db = await getDatabase()
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const transaction = db.transaction(ASSET_STORE, 'readonly')
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB getAllKeys failed'))
      const request = transaction.objectStore(ASSET_STORE).getAllKeys()
      request.onsuccess = () => resolve((request.result as IDBValidKey[]) ?? [])
      request.onerror = () => reject(request.error ?? new Error('IndexedDB getAllKeys failed'))
    })
    const removals = keys.filter((key) => !keep.has(String(key)))

    if (!removals.length) return

    await Promise.all(
      removals.map(
        (key) =>
          new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(ASSET_STORE, 'readwrite')
            transaction.oncomplete = () => resolve()
            transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB delete failed'))
            transaction.objectStore(ASSET_STORE).delete(key)
          }).catch((error) => {
            console.error('删除旧资源失败', error)
          }),
      ),
    )
  } catch (error) {
    console.error('清理资源失败', error)
  }
}
