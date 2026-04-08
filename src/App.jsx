import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Schedule from './components/Schedule'
import PersonalBrand from './components/PersonalBrand'
import MariaSwim from './components/MariaSwim'
import Agency from './components/Agency'
import Analytics from './components/Analytics'
import Intelligence from './components/Intelligence'
import ContentStrategy from './components/ContentStrategy'
import { useDataSync } from './hooks/useDataSync'

export default function App() {
  const [activeSection, setActiveSection] = useState('schedule')
  const sync = useDataSync()

  // Navigate to Personal Brand section when copy-to-brand "View →" is clicked
  useEffect(() => {
    const handler = () => setActiveSection('brand')
    window.addEventListener('ep:navigate', handler)
    return () => window.removeEventListener('ep:navigate', handler)
  }, [])

  const sections = {
    schedule:     <Schedule />,
    brand:        <PersonalBrand />,
    swim:         <MariaSwim />,
    agency:       <Agency />,
    analytics:       <Analytics />,
    intelligence:    <Intelligence />,
    contentStrategy: <ContentStrategy />,
  }

  return (
    <Layout
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      sync={sync}
    >
      {sections[activeSection]}
    </Layout>
  )
}
