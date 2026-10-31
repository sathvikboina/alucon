import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import AlumniStories from './AlumniStories';
import ResearchHighlights from './ResearchHighlights';
import EventsSection from './EventsSection';
import Infrastructure from './Infrastructure';
import StoriesFeed from '../story/StoriesFeed';
import AchievementsPage from '../achievements/AchievementsPage';

const StoriesTab = () => <StoriesFeed embedded />;
const AchievementsTab = () => <AchievementsPage embedded />;

const TABS = [
  { id: 'hall-of-fame',   label: 'Hall of Fame',   Component: AlumniStories },
  { id: 'research',       label: 'Research',       Component: ResearchHighlights },
  { id: 'events',         label: 'Events',         Component: EventsSection },
  { id: 'infrastructure', label: 'Infrastructure', Component: Infrastructure },
  { id: 'stories',        label: 'Stories',        Component: StoriesTab },
  { id: 'achievements',   label: 'Achievements',   Component: AchievementsTab },
];

const tabIndexFromSearch = (search) => {
  const id = new URLSearchParams(search).get('tab');
  const index = TABS.findIndex((tab) => tab.id === id);
  return index === -1 ? 0 : index;
};

export default function TabsWrapper() {
  const location = useLocation();
  const history = useHistory();
  const [active, setActive] = useState(() => tabIndexFromSearch(location.search));

  // Keep the tab in sync when someone follows a deep link such as
  // /showcase?tab=stories from the navbar.
  useEffect(() => {
    setActive(tabIndexFromSearch(location.search));
  }, [location.search]);

  const selectTab = (index) => {
    setActive(index);
    const params = new URLSearchParams(location.search);
    params.set('tab', TABS[index].id);
    history.replace({ pathname: location.pathname, search: params.toString() });
  };

  const Active = TABS[active].Component;

  return (
    <section className="sc-tabs-wrapper">
      <div className="sc-tabs-nav">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            className={`sc-tab-btn ${active === i ? 'active' : ''}`}
            onClick={() => selectTab(i)}
          >{tab.label}</button>
        ))}
      </div>
      <div className="sc-tab-content">
        <Active />
      </div>
    </section>
  );
}
