import { useState } from 'react'
import Layout from './components/Layout'
import Schedule from './components/Schedule'
import PersonalBrand from './components/PersonalBrand'
import MariaSwim from './components/MariaSwim'
import Agency from './components/Agency'
import Analytics from './components/Analytics'
import Intelligence from './components/Intelligence'
import { useDataSync } from './hooks/useDataSync'

export default function App() {
  const [activeSection, setActiveSection] = useState('schedule')
  const sync = useDataSync()

  const sections = {
    schedule:     <Schedule />,
    brand:        <PersonalBrand />,
    swim:         <MariaSwim />,
    agency:       <Agency />,
    analytics:    <Analytics />,
    intelligence: <Intelligence />,
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
