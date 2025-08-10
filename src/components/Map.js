import { useEffect, useRef, useState } from 'react';

import { useMap } from './hooks/useMap';

// 使用例コンポーネント
export const Map = () => {
  const { mapContainer, isLoaded } = useMap({
  });

  return (
    <div className="relative w-full h-full flex">
      <div ref={mapContainer} className="flex-1 relative" />

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