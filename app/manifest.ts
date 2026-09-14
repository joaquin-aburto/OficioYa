import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OficioYa',
    short_name: 'OficioYa',
    description: 'Encuentra técnicos verificados cerca de ti.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8FAF7',
    theme_color: '#0F4C5C',
    orientation: 'portrait-primary',
    lang: 'es-MX',
    icons: [
      { src: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  }
}
