import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Foundation from './components/Foundation.jsx'
import Capabilities from './components/Capabilities.jsx'
import Work from './components/Work.jsx'
import Contact from './components/Contact.jsx'
import useReveal from './useReveal.js'

export default function App() {
  useReveal()
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Foundation />
        <Capabilities />
        <Work />
        <Contact />
      </main>
    </>
  )
}
