import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Pool } from './screens/Pool';
import { Forge } from './screens/Forge';
import { Vault } from './screens/Vault';
import { Export } from './screens/Export';
import { Browser } from './screens/Browser';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">The Foundry</h1>
              <div className="flex gap-6">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  Pool
                </NavLink>
                <NavLink
                  to="/forge"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  Forge
                </NavLink>
                <NavLink
                  to="/vault"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  Vault
                </NavLink>
                <NavLink
                  to="/browser"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  Browser
                </NavLink>
                <NavLink
                  to="/export"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  Export
                </NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Pool />} />
          <Route path="/forge" element={<Forge />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/browser" element={<Browser />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
