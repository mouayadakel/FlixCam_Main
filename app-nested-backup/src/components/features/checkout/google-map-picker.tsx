/**
 * Address picker with optional Google Maps integration.
 * Value shape: { address?, street?, district?, city?, lat?, lng? }
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface MapAddressValue {
  address?: string
  street?: string
  district?: string
  city?: string
  lat?: number
  lng?: number
}

interface GoogleMapPickerProps {
  value: MapAddressValue | null | undefined
  onChange: (value: MapAddressValue) => void
  label?: string
  required?: boolean
  disabled?: boolean
  /** When set, load Google Places script and enable autocomplete on main address input */
  apiKey?: string | null
  className?: string
}

export function GoogleMapPicker({
  value,
  onChange,
  label,
  required,
  disabled,
  apiKey,
  className,
}: GoogleMapPickerProps) {
  const [address, setAddress] = useState(value?.address ?? '')
  const [street, setStreet] = useState(value?.street ?? '')
  const [district, setDistrict] = useState(value?.district ?? '')
  const [city, setCity] = useState(value?.city ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAddress(value?.address ?? '')
    setStreet(value?.street ?? '')
    setDistrict(value?.district ?? '')
    setCity(value?.city ?? '')
  }, [value?.address, value?.street, value?.district, value?.city])

  const emit = useCallback(
    (updates: Partial<MapAddressValue>) => {
      onChange({
        address: updates.address ?? address,
        street: updates.street ?? street,
        district: updates.district ?? district,
        city: updates.city ?? city,
        lat: updates.lat ?? value?.lat,
        lng: updates.lng ?? value?.lng,
      })
    },
    [onChange, address, street, district, city, value?.lat, value?.lng]
  )

  useEffect(() => {
    if (!apiKey || !inputRef.current) return
    let cancelled = false
    const loadScript = () => {
      if ((window as any).google?.maps?.places) {
        initAutocomplete()
        return
      }
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => initAutocomplete()
      document.head.appendChild(script)
    }
    const initAutocomplete = () => {
      if (cancelled || !inputRef.current) return
      const autocomplete = new (window as any).google.maps.places.Autocomplete(
        inputRef.current,
        { types: ['address'], fields: ['address_components', 'formatted_address', 'geometry'] }
      )
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place.address_components) return
        const addr = place.formatted_address || ''
        let streetName = ''
        let districtName = ''
        let cityName = ''
        for (const c of place.address_components) {
          if (c.types.includes('route')) streetName = c.long_name
          if (c.types.includes('sublocality') || c.types.includes('neighborhood'))
            districtName = c.long_name
          if (c.types.includes('administrative_area_level_2')) cityName = c.long_name
          if (c.types.includes('locality') && !cityName) cityName = c.long_name
        }
        const lat = place.geometry?.location?.lat?.()
        const lng = place.geometry?.location?.lng?.()
        setAddress(addr)
        setStreet(streetName)
        setDistrict(districtName)
        setCity(cityName)
        emit({
          address: addr,
          street: streetName,
          district: districtName,
          city: cityName,
          lat: lat,
          lng: lng,
        })
      })
    }
    loadScript()
    return () => {
      cancelled = true
    }
  }, [apiKey, emit])

  const handleAddressBlur = () => emit({ address })
  const handleStreetBlur = () => emit({ street })
  const handleDistrictBlur = () => emit({ district })
  const handleCityBlur = () => emit({ city })

  return (
    <div className={className}>
      {label && (
        <Label className="mb-2 block">
          {label}
          {required && ' *'}
        </Label>
      )}
      <div className="space-y-3">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search address or enter manually"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={handleAddressBlur}
          disabled={disabled}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input
            type="text"
            placeholder="Street"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            onBlur={handleStreetBlur}
            disabled={disabled}
          />
          <Input
            type="text"
            placeholder="District"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            onBlur={handleDistrictBlur}
            disabled={disabled}
          />
          <Input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onBlur={handleCityBlur}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
