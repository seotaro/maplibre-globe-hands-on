import React, { useState } from 'react';
import { Map } from './components/Map';

function App() {
  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex flex-col">

        {/* ヘッダー */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-4 py-4">
            <div className="flex items-center justify-start">
              <h1 className="text-2xl font-bold text-gray-900">
                MapLibre Globe View hands-on
              </h1>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 flex overflow-auto">
          <Map />
        </main>
      </div>
    </div>
  );
}

export default App;