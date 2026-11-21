import { LOGO_PATHS, LOGO_VIEWBOX } from '../brand/logo.js'

// The Apheleia "A" mark. Inherits colour from `color` unless `fill` is given.
export default function Logo({ fill = 'currentColor', title, ...props }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX.join(' ')}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
      {...props}
    >
      {title && <title>{title}</title>}
      {LOGO_PATHS.map((d, i) => (
        <path key={i} d={d} fill={fill} />
      ))}
    </svg>
  )
}
