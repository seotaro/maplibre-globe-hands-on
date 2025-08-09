import { useEffect, useRef, useState } from 'react';

import { useMap } from './hooks/useMap';

// 使用例コンポーネント
export const Map = () => {
  const { mapContainer, isLoaded } = useMap({
    zoom: 10, center: [139.6917, 35.6895]
  });

  return (
    <div style={{ position: 'relative', width: '100%', height: '500px' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* ローディング表示 */}
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '12px 20px',
          borderRadius: '4px',
          zIndex: 1000
        }}>
          マップを読み込み中...
        </div>
      )}
    </div>
  );
};