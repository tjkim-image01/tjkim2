const PATHS: Record<string, string> = {
  search: 'M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  image: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2v8.6l4-4 3.5 3.5L16 12l3 3V7H5zm3 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
  settings:
    'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-1.6-7h3.2l.5 2.4 1.6.9 2.3-.8 1.6 2.8-1.8 1.6v1.8l1.8 1.6-1.6 2.8-2.3-.8-1.6.9-.5 2.4h-3.2l-.5-2.4-1.6-.9-2.3.8-1.6-2.8 1.8-1.6v-1.8L4.4 8.3 6 5.5l2.3.8 1.6-.9z',
  refresh: 'M12 5a7 7 0 0 1 6.3 4H16v2h6V5h-2v2.3A9 9 0 0 0 3 12h2a7 7 0 0 1 7-7zm7 7a7 7 0 0 1-13.3 3H8v-2H2v6h2v-2.3A9 9 0 0 0 21 12h-2z',
  sheet: 'M5 3h10l4 4v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v16h12V8h-4V5H6zm2 6h8v2H8v-2zm0 4h8v2H8v-2z',
  user: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c4.4 0 8 2 8 4.5V20H4v-1.5C4 16 7.6 14 12 14z',
  back: 'M15.4 6.4 14 5l-7 7 7 7 1.4-1.4L9.8 12z',
  check: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4z',
  warn: 'M12 3 1.5 21h21L12 3zm0 4.5L18.9 19H5.1L12 7.5zM11 10h2v5h-2v-5zm0 6h2v2h-2v-2z',
  external: 'M14 4h6v6h-2V7.4l-7.3 7.3-1.4-1.4L16.6 6H14V4zM5 6h6v2H7v9h9v-4h2v6H5V6z',
  filter: 'M3 5h18v2l-7 7v6l-4-2v-4L3 7z',
  close: 'M18.3 5.7 12 12l6.3 6.3-1.4 1.4L12 13.4l-6.3 6.3-1.4-1.4L10.6 12 4.3 5.7l1.4-1.4L12 10.6l6.3-6.3z',
}

export function Icon({ name, size = 18 }: { name: keyof typeof PATHS | string; size?: number }) {
  const d = PATHS[name] ?? PATHS.search
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={d} fill="currentColor" />
    </svg>
  )
}
