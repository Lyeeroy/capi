import React from 'react';
import './EpisodeList.css'; // Assuming your CSS file is named EpisodeList.css

const EpisodeList = ({ episodes, currentEpisodeId }) => {
  return (
    <div className="episode-list">
      {episodes.map(episode => {
        const isPlaying = episode.id === currentEpisodeId;

        return (
          <div key={episode.id} className="episode-item">
            <div className={`episode-icon-container${isPlaying ? ' playing' : ''}`}>
              {/* SVG icon code here */}
            </div>
            <div className="episode-details">
              <h3 className="episode-title">{episode.title}</h3>
              <p className="episode-description">{episode.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EpisodeList;