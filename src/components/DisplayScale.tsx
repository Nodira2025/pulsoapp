import { useEffect, useState } from 'react'
import { ZoomIn } from 'lucide-react'

const sizes = [80, 90, 100, 110, 120]
export function DisplayScale() {
  const [size, setSize] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('pulso-content-size'))
      return sizes.includes(saved) ? saved : 100
    } catch {
      return 100
    }
  })
  useEffect(() => {
    document.documentElement.style.setProperty('--content-zoom', String(size / 100))
    try {
      localStorage.setItem('pulso-content-size', String(size))
    } catch {
      /* Optional preference. */
    }
  }, [size])
  return (
    <label
      className="display-scale"
      title="Tamaño del contenido. 100% restablece el tamaño original."
    >
      <ZoomIn size={17} aria-hidden="true" />
      <select
        aria-label="Tamaño del contenido"
        value={size}
        onChange={(event) => setSize(Number(event.target.value))}
      >
        {sizes.map((value) => (
          <option key={value} value={value}>
            {value}%
          </option>
        ))}
      </select>
    </label>
  )
}
