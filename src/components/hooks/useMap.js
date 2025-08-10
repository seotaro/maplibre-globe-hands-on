import { useEffect, useRef, useState } from 'react';
import maplibregl, { MercatorCoordinate } from 'maplibre-gl';

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

  // create a custom style layer to implement the WebGL content
  const customLayer = {
    id: 'customLayer',
    type: 'custom',
    shaderMap: new Map(),

    // Helper method for creating a shader based on current map projection - globe will automatically switch to mercator when some condition is fulfilled.
    getShader(gl, shaderDescription) {
      // Pick a shader based on the current projection, defined by `variantName`.
      if (this.shaderMap.has(shaderDescription.variantName)) {
        return this.shaderMap.get(shaderDescription.variantName);
      }

      // Create GLSL source for vertex shader
      //
      // Note that we need to use a complex function to project from the source mercator
      // coordinates to the globe. Internal shaders in MapLibre need to do this too.
      // This is done using the `projectTile` function.
      // In MapLibre, this function accepts vertex coordinates local to the current tile,
      // in range 0..EXTENT (8192), but for custom layers MapLibre supplies uniforms such that
      // the function accepts mercator coordinates of the whole world in range 0..1.
      // This is controlled by the `u_projection_tile_mercator_coords` uniform.
      //
      // The `projectTile` function can also handle mercator to globe transitions and can
      // handle the mercator projection - different code is supplied based on what projection is used,
      // and for this reason we use different shaders based on what shader projection variant is currently used.
      // See `variantName` usage earlier in this file.
      //
      // The code for the projection function and uniforms is also supplied by MapLibre
      // and must be injected into custom layer shaders in order to draw on a globe.
      // We simply use string interpolation for that here.
      //
      // See MapLibre source code for more details, especially src/shaders/_projection_globe.vertex.glsl

      // link the two shaders into a WebGL program
      const program = gl.createProgram();

      // create a vertex shader
      {
        const source = `#version 300 es
              // Inject MapLibre projection code
              ${shaderDescription.vertexShaderPrelude}
              ${shaderDescription.define}
  
              in vec2 a_position;
              in vec3 a_color;
              out vec3 vColor;
  
              void main() {
                  gl_Position = projectTile(a_position);
                  vColor = a_color;
              }`;

        const shader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        const log = gl.getShaderInfoLog(shader);
        if (log) {
          console.error('Vertex shader compile error:', log);
        }
        gl.attachShader(program, shader);
      }

      // create a fragment shader
      {
        const source = `#version 300 es
            precision mediump float;

            in vec3 vColor;
            out highp vec4 fragColor;
            void main() {
                fragColor = vec4(vColor, 0.9);
            }`;

        const shader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        const log = gl.getShaderInfoLog(shader);
        if (log) {
          console.error('Fragment shader compile error:', log);
        }
        gl.attachShader(program, shader);
      }

      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
      }

      this.aPosition = gl.getAttribLocation(program, 'a_position');
      this.aColor = gl.getAttribLocation(program, 'a_color');
      this.shaderMap.set(shaderDescription.variantName, program);

      return program;
    },

    // method called when the layer is added to the map
    // Search for StyleImageInterface in https://maplibre.org/maplibre-gl-js/docs/API/
    onAdd(map, gl) {
      // define vertices of the triangle to be rendered in the custom style layer
      const p1 = maplibregl.MercatorCoordinate.fromLngLat({
        lng: 125.0,
        lat: 45.0
      });
      const p2 = maplibregl.MercatorCoordinate.fromLngLat({
        lng: 135.0,
        lat: 35.0
      });
      const p3 = maplibregl.MercatorCoordinate.fromLngLat({
        lng: 145.0,
        lat: 55.0
      });
      const p4 = maplibregl.MercatorCoordinate.fromLngLat({
        lng: 155.0,
        lat: 45.0
      });

      // create and initialize a WebGLBuffer to store vertex and color data
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          // x, y, r, g, b
          p1.x, p1.y, 1.0, 0.0, 0.0,
          p2.x, p2.y, 0.0, 1.0, 0.0,
          p3.x, p3.y, 0.0, 0.0, 1.0,
          p4.x, p4.y, 1.0, 1.0, 0.0,
        ]),
        gl.STATIC_DRAW
      );

      // Explanation of horizon clipping in MapLibre globe projection:
      //
      // When zooming in, the triangle will eventually start doing what at first glance
      // appears to be clipping the underlying map.
      //
      // Instead it is being clipped by the "horizon" plane, which the globe uses to
      // clip any geometry behind horizon (regular face culling isn't enough).
      // The horizon plane is not necessarily aligned with the near/far planes.
      // The clipping is done by assigning a custom value to `gl_Position.z` in the `projectTile`
      // MapLibre uses a constant z value per layer, so `gl_Position.z` can be anything,
      // since it later gets overwritten by `glDepthRange`.
      //
      // At high zooms, the triangle's three vertices can end up beyond the horizon plane,
      // resulting in the triangle getting clipped.
      //
      // This can be fixed by subdividing the triangle's geometry.
      // This is in general advisable to do, since without subdivision
      // geometry would not project to a curved shape under globe projection.
      // MapLibre also internally subdivides all geometry when globe projection is used.
    },

    // method fired on each animation frame
    render(gl, args) {
      const program = this.getShader(gl, args.shaderData);
      gl.useProgram(program);
      gl.uniformMatrix4fv(
        gl.getUniformLocation(program, 'u_projection_fallback_matrix'),
        false,
        args.defaultProjectionData.fallbackMatrix // convert mat4 from gl-matrix to a plain array
      );
      gl.uniformMatrix4fv(
        gl.getUniformLocation(program, 'u_projection_matrix'),
        false,
        args.defaultProjectionData.mainMatrix // convert mat4 from gl-matrix to a plain array
      );
      gl.uniform4f(
        gl.getUniformLocation(program, 'u_projection_tile_mercator_coords'),
        ...args.defaultProjectionData.tileMercatorCoords
      );
      gl.uniform4f(
        gl.getUniformLocation(program, 'u_projection_clipping_plane'),
        ...args.defaultProjectionData.clippingPlane
      );
      gl.uniform1f(
        gl.getUniformLocation(program, 'u_projection_transition'),
        args.defaultProjectionData.projectionTransition
      );

      const stride = (2 + 3) * 4; // float * 5

      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.enableVertexAttribArray(this.aPosition);
      gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(this.aColor);
      gl.vertexAttribPointer(this.aColor, 3, gl.FLOAT, false, stride, 2 * 4);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
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

      // カスタムレイヤー
      map.current.addLayer(customLayer);
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
