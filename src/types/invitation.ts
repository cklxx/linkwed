export interface ScheduleItem {
  time: string
  label: string
  description: string
}

export interface InvitationDetails {
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

export interface Coordinates {
  lat: number
  lng: number
}

export interface LocationResult {
  id: string
  name: string
  address: string
  location: Coordinates
}

export interface UploadedImage {
  id: string
  name: string
  src: string
  file?: File
}

export interface MusicTrack {
  id: string
  name: string
  src: string
  isDefault: boolean
  credit?: string
  file?: File
}
