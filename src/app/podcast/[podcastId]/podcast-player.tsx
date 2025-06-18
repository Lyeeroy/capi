import React from 'react';
import AppEpisodeNavigation from './AppEpisodeNavigation';

const PodcastPlayer = () => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
      <div className="w-full md:w-auto">
        <AppEpisodeNavigation />
      </div>
      <div className="flex justify-center md:justify-end space-x-2 w-full md:w-auto">
        {/* Player controls */}
      </div>
    </div>
  );
};

export default PodcastPlayer;