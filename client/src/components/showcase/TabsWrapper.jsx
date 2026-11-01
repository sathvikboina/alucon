import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import axios from 'axios';
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

const tabIdFromSearch = (search) =>
  new URLSearchParams(search).get('tab') || TABS[0].id;

export default function TabsWrapper() {
  const location = useLocation();
  const history = useHistory();
  const [counts, setCounts] = useState(null);
  const [activeId, setActiveId] = useState(() =>
    tabIdFromSearch(location.search)
  );

  // Only render sections that actually have records.
  useEffect(() => {
    let cancelled = false;
    axios
      .get('/api/availability')
      .then((res) => {
        if (!cancelled) setCounts(res.data || { sections: {} });
      })
      .catch(() => {
        if (!cancelled) setCounts({ sections: {} });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleTabs = counts
    ? TABS.filter((tab) => (counts.sections?.[tab.id] || 0) > 0)
    : [];
  const activeTab =
    visibleTabs.find((tab) => tab.id === activeId) || visibleTabs[0];

  // Keep the URL on a tab that is actually visible.
  useEffect(() => {
    if (!counts || !activeTab) return;
    if (activeTab.id === activeId) return;

    setActiveId(activeTab.id);
    const params = new URLSearchParams(location.search);
    params.set('tab', activeTab.id);
    history.replace({ pathname: location.pathname, search: params.toString() });
  }, [counts, activeTab, activeId, history, location.pathname, location.search]);

  const selectTab = (id) => {
    setActiveId(id);
    const params = new URLSearchParams(location.search);
    params.set('tab', id);
    history.replace({ pathname: location.pathname, search: params.toString() });
  };

  if (!counts) {
    return (
      <section className="sc-tabs-wrapper">
        <p className="sc-empty">Loading showcase…</p>
      </section>
    );
  }

  if (!visibleTabs.length) {
    return (
      <section className="sc-tabs-wrapper">
        <p className="sc-empty">
          The institutional showcase is being prepared. Please check back soon.
        </p>
      </section>
    );
  }

  const Active = activeTab.Component;

  return (
    <section className="sc-tabs-wrapper">
      <div className="sc-tabs-nav">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            className={`sc-tab-btn ${activeTab.id === tab.id ? 'active' : ''}`}
            onClick={() => selectTab(tab.id)}
          >{tab.label}</button>
        ))}
      </div>
      <div className="sc-tab-content">
        <Active />
      </div>
    </section>
  );
}
