import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Marker.prototype.options.icon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})

const MapViewUpdater = ({ position }: { position: { lat: number; lng: number } }) => {
  const map = useMap()

  useEffect(() => {
    map.setView([position.lat, position.lng], 14, {
      animate: true,
      duration: 1,
    })
  }, [map, position.lat, position.lng])

  return null
}

interface InvitationMapProps {
  coordinates: { lat: number; lng: number }
  venue: string
  address: string
  height: number
}

const InvitationMap = ({ coordinates, venue, address, height }: InvitationMapProps) => {
  return (
    <MapContainer center={[coordinates.lat, coordinates.lng]} zoom={14} style={{ height }} scrollWheelZoom={false}>
      <MapViewUpdater position={coordinates} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[coordinates.lat, coordinates.lng]}>
        <Popup>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">{venue}</p>
            <p className="text-xs text-slate-600">{address}</p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  )
}

export default InvitationMap
