import { useState } from 'react'
import { ZoomIn } from 'lucide-react'

const sizes = [80, 90, 100, 110, 120]
const KEY = 'pulso-content-size'
function readSize() {
  try {
    const saved = Number(localStorage.getItem(KEY))
    return sizes.includes(saved) ? saved : 100
  } catch {
    return 100
  }
}
function applySize(size: number) {
  document.documentElement.style.setProperty('--content-zoom', String(size / 100))
  try {
    localStorage.setItem(KEY, String(size))
  } catch {
    /* Optional preference. */
  }
}
// Se llama una vez al arrancar, para que el tamaño elegido rija aunque el control no esté en pantalla.
export function initDisplayScale() {
  applySize(readSize())
}
export function DisplayScale() {
  const [size, setSize] = useState(readSize)
  return (
    <label
      className="display-scale"
      title="Tamaño del contenido. 100% restablece el tamaño original."
    >
      <ZoomIn size={17} aria-hidden="true" />
      <select
        aria-label="Tamaño del contenido"
        value={size}
        onChange={(event) => {
          const value = Number(event.target.value)
          setSize(value)
          applySize(value)
        }}
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
