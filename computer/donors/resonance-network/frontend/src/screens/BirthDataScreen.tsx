import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const UTC_OFFSETS = Array.from({ length: 27 }, (_, i) => i - 12); // -12 .. +14

const BirthDataScreen: React.FC = () => {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthLocation, setBirthLocation] = useState('');
  const [utcOffset, setUtcOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { createOrLoadProfile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const email = sessionStorage.getItem('pending_email') || '';
    const name = sessionStorage.getItem('pending_name') || 'Explorer';
    const birth = {
      date: birthDate,
      time: birthTime,
      utc_offset_hours: utcOffset,
      latitude: 0,
      longitude: 0,
      location_label: birthLocation,
    };

    try {
      await createOrLoadProfile({
        email,
        displayName: name,
        birth,
      });
      sessionStorage.setItem('pending_birth', JSON.stringify(birth));
      navigate('/questionnaire');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to calculate your chart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-green safe-area-top safe-area-bottom">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="text-center mb-8">
          <i className="fa fa-calendar text-6xl text-retro-yellow mb-4 animate-pixel-pulse"></i>
          <h1 className="text-3xl font-pixel text-white text-shadow-pixel mb-2">
            BIRTH DATA
          </h1>
          <p className="text-white/80 font-pixel text-sm">
            Real planetary positions, calculated live from your birth moment
          </p>
        </div>

        <div className="pixel-card animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-retro-yellow font-pixel text-sm mb-2">
                <i className="fa fa-calendar mr-2"></i>
                BIRTH DATE
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full pixel-input"
                required
              />
            </div>

            <div>
              <label className="block text-retro-yellow font-pixel text-sm mb-2">
                <i className="fa fa-clock mr-2"></i>
                BIRTH TIME (local)
              </label>
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="w-full pixel-input"
                required
              />
              <p className="text-white/60 font-pixel text-xs mt-1">
                Exact time matters -- gates change every ~22 minutes
              </p>
            </div>

            <div>
              <label className="block text-retro-yellow font-pixel text-sm mb-2">
                <i className="fa fa-globe mr-2"></i>
                UTC OFFSET AT BIRTH
              </label>
              <select
                value={utcOffset}
                onChange={(e) => setUtcOffset(Number(e.target.value))}
                className="w-full pixel-select"
              >
                {UTC_OFFSETS.map((o) => (
                  <option key={o} value={o}>
                    UTC{o >= 0 ? '+' : ''}{o}
                  </option>
                ))}
              </select>
              <p className="text-white/60 font-pixel text-xs mt-1">
                e.g. Pacific Daylight Time = UTC-7
              </p>
            </div>

            <div>
              <label className="block text-retro-yellow font-pixel text-sm mb-2">
                <i className="fa fa-location-dot mr-2"></i>
                BIRTH LOCATION
              </label>
              <input
                type="text"
                value={birthLocation}
                onChange={(e) => setBirthLocation(e.target.value)}
                className="w-full pixel-input"
                placeholder="City, State/Country"
              />
            </div>

            {error && (
              <div className="bg-retro-red/20 border-2 border-retro-red p-3 text-retro-red font-pixel text-sm">
                <i className="fa fa-exclamation-triangle mr-2"></i>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !birthDate || !birthTime}
              className="w-full pixel-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <i className="fa fa-spinner animate-pixel-spin mr-2"></i>
                  CALCULATING REAL CHART...
                </>
              ) : (
                <>
                  <i className="fa fa-arrow-right mr-2"></i>
                  CONTINUE
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-white/60 font-pixel text-xs">
            Calculated from live JPL ephemeris -- not a lookup table
          </p>
        </div>
      </div>
    </div>
  );
};

export default BirthDataScreen;
