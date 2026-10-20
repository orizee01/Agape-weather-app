export interface Place {
  name: string
  latitude: number
  longitude: number
}

export interface Forecast {
  current: {
    temperature_2m: number
    weather_code: number
    is_day: number
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

export interface Weather {
  city: string
  forecast: Forecast
}

export class CityNotFoundError extends Error {
  constructor(city: string) {
    super(`We couldn't find "${city}". Check the spelling and try another city.`)
  }
}

const GEOCODING_TIMEOUT_MS = 2000

async function fetchJson<T>(url: string, timeoutMs?: number): Promise<T> {
  const res = await fetch(url, {
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json() as Promise<T>
}

async function geocodeOpenMeteo(city: string): Promise<Place | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  const data = await fetchJson<{
    results?: { name: string; latitude: number; longitude: number }[]
  }>(url, GEOCODING_TIMEOUT_MS)
  const hit = data.results?.[0]
  return hit
    ? { name: hit.name, latitude: hit.latitude, longitude: hit.longitude }
    : null
}

async function geocodePhoton(city: string): Promise<Place | null> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(city)}&limit=1&layer=city`
  const data = await fetchJson<{
    features?: {
      geometry: { coordinates: [number, number] }
      properties: { name?: string }
    }[]
  }>(url)
  const hit = data.features?.[0]
  if (!hit) return null
  // Photon returns [longitude, latitude]
  const [longitude, latitude] = hit.geometry.coordinates
  return { name: hit.properties.name ?? city, latitude, longitude }
}

/** Open-Meteo first; Photon only if Open-Meteo fails or takes over 2 seconds. */
export async function geocode(city: string): Promise<Place> {
  let place: Place | null
  try {
    place = await geocodeOpenMeteo(city)
  } catch {
    place = await geocodePhoton(city)
  }
  if (!place) throw new CityNotFoundError(city)
  return place
}

export function getForecast({ latitude, longitude }: Place): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    forecast_days: '4',
    timezone: 'auto',
  })
  return fetchJson<Forecast>(`https://api.open-meteo.com/v1/forecast?${params}`)
}
