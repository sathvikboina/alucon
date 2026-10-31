import { useState } from 'react';
import AlumniStories from './AlumniStories';
import ResearchHighlights from './ResearchHighlights';
import EventsSection from './EventsSection';
import Infrastructure from './Infrastructure';

const TABS = ['Hall of Fame', 'Research', 'Events', 'Infrastructure'];
const COMPONENTS = [AlumniStories, ResearchHighlights, EventsSection, Infrastructure];

export default function TabsWrapper() {
  const [active, setActive] = useState(0);
  const Active = COMPONENTS[active];
  return (
    <section className="sc-tabs-wrapper">
      <div className="sc-tabs-nav">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`sc-tab-btn ${active === i ? 'active' : ''}`}
            onClick={() => setActive(i)}
          >{tab}</button>
        ))}
      </div>
      <div className="sc-tab-content">
        <Active />
      </div>
    </section>
  );
}