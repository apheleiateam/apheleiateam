// Shared site content — edit here to update nav, footer and contact details.

export const EMAIL = 'apheleia.team@gmail.com'

export const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'process', label: 'Process' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'work', label: 'Work' },
  { id: 'team', label: 'Team' },
  { id: 'principles', label: 'Principles' },
]

export const INSTAGRAM = { handle: '@apheleia.team', url: 'https://www.instagram.com/apheleia.team/' }

export const INTERESTS = ['UI/UX Design', 'Development', 'System Architecture', 'Automation', 'Brand & Strategy', 'Not sure yet']

// Team photos live in public/team, named `name_email.jpeg`. Add a file there and
// list it here; `name` is shown as written (edit it for spacing, e.g. "Ram Charan").
const TEAM_FILES = [
  'chandraprakash_dayanchand307@gmail.com.jpeg',
  'mayur_gksmh20@gmail.com.jpeg',
  'mehanth_mehanth362@gmail.com.jpeg',
  'monesh_monesh24developer@gmail.com.jpeg',
  'paveethiran_skpaveethiran@gmail.com.jpeg',
  'ramanan_shutlight7@gmail.com.jpeg',
  'ramcharan_ramcharanslm8@gmail.com.jpeg',
]

export const TEAM = TEAM_FILES.map((file) => {
  const [slug, ...rest] = file.replace(/\.jpe?g$/i, '').split('_')
  return {
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    email: rest.join('_'),
    photo: `/team/${file}`,
  }
})
