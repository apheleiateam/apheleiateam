// Splits a heading into words that rise and un-blur one after another when the
// nearest `.reveal` ancestor scrolls into view. `start` offsets the stagger so
// multi-line headings (split around <br />) keep one continuous sequence.
export default function Words({ children, start = 0 }) {
  const words = String(children).split(' ')
  return words.flatMap((w, i) => [
    <span key={i} className="w" style={{ '--i': start + i }}>
      {w}
    </span>,
    i < words.length - 1 ? ' ' : null,
  ])
}
