import React, { useState } from 'react';
import DoubtForm from './DoubtForm';
import DoubtList from './DoubtList';
import './DoubtRoom.css'; // 🔥 Add this line to include styles

const DoubtRoom = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  return (
    <div className="doubt-room">

      <div className="doubt-room-header">
        <span className="doubt-kicker">Peer-to-Peer Help</span>
        <h1>Doubt Room</h1>
        <p className="doubt-subtext">
          Ask questions, unblock technical challenges, and get guidance from seniors and alumni
        </p>
      </div>

  {/* rest stays SAME */}

      <div className="doubt-form-container">
        <DoubtForm refresh={triggerRefresh} />
      </div>

      <hr className="doubt-divider" />

      <DoubtList key={refreshKey} />
    </div>
  );
};

export default DoubtRoom;
