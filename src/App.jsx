import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import CurrentWeatherPage from './pages/CurrentWeatherPage';
import HistoricalPage from './pages/HistoricalPage';
import { reverseGeocode } from './api/openMeteo';

const FALLBACK_COORDS = {
  latitude: 28.6139,
  longitude: 77.209,
};

function App() {
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState('Detecting location...');
  const [locationError, setLocationError] = useState('');

  const detectLocation = useCallback(() => {
    setLocationError('');
    setLocationName('Detecting location...');

    if (!navigator.geolocation) {
      setCoords(FALLBACK_COORDS);
      setLocationName('Fallback: New Delhi, India');
      setLocationError('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextCoords = {
          latitude: Number(position.coords.latitude.toFixed(4)),
          longitude: Number(position.coords.longitude.toFixed(4)),
        };

        setCoords(nextCoords);

        try {
          const name = await reverseGeocode(nextCoords.latitude, nextCoords.longitude);
          setLocationName(name);
        } catch {
          setLocationName('Detected Location');
        }
      },
      () => {
        setCoords(FALLBACK_COORDS);
        setLocationName('Fallback: New Delhi, India');
        setLocationError('GPS permission denied. Using fallback coordinates.');
      },
      {
        maximumAge: 10 * 60 * 1000,
        timeout: 10000,
      },
    );
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      detectLocation();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [detectLocation]);

  const locationInfo = useMemo(() => {
    if (!coords) {
      return 'Waiting for geolocation...';
    }

    return `${coords.latitude}, ${coords.longitude}`;
  }, [coords]);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Open-Meteo Weather Dashboard</p>
          <h1>Live + Historical Weather Intelligence</h1>
          <p className="subtext">{locationName}</p>
          <p className="coords">{locationInfo}</p>
          {locationError ? <p className="warning">{locationError}</p> : null}
        </div>
        <button className="btn-primary" type="button" onClick={detectLocation}>
          Refresh GPS
        </button>
      </header>

      <nav className="nav-tabs" aria-label="Weather views">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Current + Hourly
        </NavLink>
        <NavLink to="/historical" className={({ isActive }) => (isActive ? 'active' : '')}>
          Historical Range
        </NavLink>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<CurrentWeatherPage coords={coords} />} />
          <Route path="/historical" element={<HistoricalPage coords={coords} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
