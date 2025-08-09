import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

export const useMap = (options = {}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // デフォルトオプション
  const defaultOptions = {
    style: 'std.json',
    center: [139.6917, 35.6895], // 東京駅
    zoom: 12,
    ...options
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    // マップ初期化
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      ...defaultOptions
    });

    // マップロード完了イベント
    map.current.on('load', () => {
      setIsLoaded(true);
    });

    // クリーンアップ
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // マーカー追加メソッド
  const addMarker = (lngLat, options = {}) => {
    if (!map.current) return null;

    const marker = new maplibregl.Marker(options)
      .setLngLat(lngLat)
      .addTo(map.current);

    return marker;
  };

  // 中心座標移動メソッド
  const flyTo = (center, zoom = null) => {
    if (!map.current) return;

    const flyOptions = { center };
    if (zoom !== null) flyOptions.zoom = zoom;

    map.current.flyTo(flyOptions);
  };

  // 現在の中心座標取得
  const getCenter = () => {
    return map.current ? map.current.getCenter() : null;
  };

  // 現在のズームレベル取得
  const getZoom = () => {
    return map.current ? map.current.getZoom() : null;
  };

  return {
    mapContainer,
    map: map.current,
    isLoaded,
    addMarker,
    flyTo,
    getCenter,
    getZoom
  };
};
