import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import SplashScreen from './screens/SplashScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import BirthDataScreen from './screens/BirthDataScreen';
import QuestionnaireScreen from './screens/QuestionnaireScreen';
import HomeDashboard from './screens/HomeDashboard';
import DailyCheckIn from './screens/DailyCheckIn';
import PodSpace from './screens/PodSpace';
import PodsBrowse from './screens/PodsBrowse';
import ProfileScreen from './screens/ProfileScreen';
import ChartScreen from './screens/ChartScreen';
import MarketScreen from './screens/MarketScreen';
import FieldScreen from './screens/FieldScreen';
import BuilderHubScreen from './screens/BuilderHubScreen';
import ResonanceWeaverScreen from './screens/ResonanceWeaverScreen';
import OrganismScreen from './screens/OrganismScreen';
import ConnectScreen from './screens/ConnectScreen';
import CreateScreen from './screens/CreateScreen';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, restored } = useAuth();
  if (!restored) return <p role="status">Restoring your profile…</p>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/welcome" replace />;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, hasProfile } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/welcome" element={<WelcomeScreen />} />
      <Route 
        path="/birth-data" 
        element={
          <BirthDataScreen />
        } 
      />
      <Route 
        path="/questionnaire" 
        element={
          <ProtectedRoute>
            <QuestionnaireScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            {hasProfile ? <HomeDashboard /> : <Navigate to="/birth-data" replace />}
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/check-in" 
        element={
          <ProtectedRoute>
            <DailyCheckIn />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pod/:podId" 
        element={
          <ProtectedRoute>
            <PodSpace />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pods" 
        element={
          <ProtectedRoute>
            <PodsBrowse />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <ProfileScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/chart" 
        element={
          <ProtectedRoute>
            <ChartScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/market" 
        element={
          <ProtectedRoute>
            <MarketScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/field" 
        element={
          <ProtectedRoute>
            <FieldScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/builder-hub" 
        element={
          <ProtectedRoute>
            <BuilderHubScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/weaver" 
        element={
          <ProtectedRoute>
            <ResonanceWeaverScreen />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/organism"
        element={
          <ProtectedRoute>
            <OrganismScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/connect"
        element={<ProtectedRoute><ConnectScreen /></ProtectedRoute>}
      />
      <Route
        path="/create"
        element={<ProtectedRoute><CreateScreen /></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-pixel-dark">
          <AppRoutes />
</div>
      </AuthProvider>
    </Router>
  );
};

export default App;