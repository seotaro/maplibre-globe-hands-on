import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

import { makeGraticuleGeoJson } from '../../utils'

export const useMap = (options = {}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // デフォルトオプション
  const defaultOptions = {
    style: 'https://demotiles.maplibre.org/style.json',
    center: [139.6917, 35.6895], // 東京駅
    zoom: 3,
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

      map.current.setProjection({
        type: 'globe',
      });

      // 緯度経度線 
      {
        map.current.addSource('graticule', { type: 'geojson', data: makeGraticuleGeoJson });

        map.current.addLayer({
          id: 'graticule-lines',
          type: 'line',
          source: 'graticule',
          paint: {
            'line-color': '#F00',
            'line-width': 1,
            'line-opacity': 0.5,
          }
        });
      }

      // イメージをマッピングする
      {
        map.current.addSource('image1', {
          type: 'image',
          url: 'image.png',
          coordinates: [
            [130.0, 40.0], // left top     : west north
            [150.0, 40.0], // right top    : east north
            [150.0, 30.0], // right bottom : east south
            [130.0, 30.0]  // left bottom  : west south
          ]
        });

        map.current.addLayer({
          id: 'image1-layer',
          type: 'raster',
          source: 'image1',
          paint: {
            'raster-opacity': 0.8
          }
        });
      }

      // イメージをマッピングする
      {
        map.current.addSource('image2', {
          type: 'image',
          url: 'image.png',
          coordinates: [
            [130.0, 80.0], // left top     : west north
            [150.0, 80.0], // right top    : east north
            [150.0, 70.0], // right bottom : east south
            [130.0, 70.0]  // left bottom  : west south
          ]
        });

        map.current.addLayer({
          id: 'image2-layer',
          type: 'raster',
          source: 'image2',
          paint: {
            'raster-opacity': 0.8
          }
        });
      }


      // イメージをマッピングする
      {
        map.current.addSource('image3', {
          type: 'image',
          url: 'image.png',
          coordinates: [
            [130.0, 60.0], // left top     : west north
            [150.0, 60.0], // right top    : east north
            [150.0, 50.0], // right bottom : east south
            [130.0, 50.0]  // left bottom  : west south
          ]
        });

        map.current.addLayer({
          id: 'image3-layer',
          type: 'raster',
          source: 'image3',
          paint: {
            'raster-opacity': 0.8
          }
        });
      }
    });

    // クリーンアップ
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

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
    flyTo,
    getCenter,
    getZoom
  };
};
