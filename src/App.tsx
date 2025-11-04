import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { useAuthStore } from './store/authStore';
import { usePlaylistStore } from './store/playlistStore';
import { useThemeStore } from './store/themeStore';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import Toaster from './components/Toaster';

const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const PlaylistPage = lazy(() => import('./pages/PlaylistPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const LikedSongsPage = lazy(() => import('./pages/LikedSongsPage'));
const RecentlyPlayedPage = lazy(() => import('./pages/RecentlyPlayedPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ArtistPage = lazy(() => import('./pages/ArtistPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function App() {
  const { checkAuth, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { fetchUserData, isLoading: isUserDataLoading } = usePlaylistStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData();
    }
  }, [isAuthenticated, fetchUserData]);

  useEffect(() => {
    if (theme) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
  }, [theme]);

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (isAuthLoading || isUserDataLoading) {
      return <LoadingSpinner />;
    }
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };

  // If you're still having issues, try this alternative ProtectedRoute:
  const ProtectedRouteAlt = ({ children }: { children: React.ReactNode }) => {
    if (isAuthLoading || isUserDataLoading) {
      return <LoadingSpinner />;
    }
    
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    
    return <>{children}</>;
  };

  return (
    <HashRouter>
      <ErrorBoundary>
        <div className={theme}>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route path="/" element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="artist/:id" element={<ArtistPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route
                  path="library"
                  element={
                    <ProtectedRoute>
                      <LibraryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="playlist/:id"
                  element={
                    <ProtectedRoute>
                      <PlaylistPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="liked-songs"
                  element={
                    <ProtectedRoute>
                      <LikedSongsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="recently-played"
                  element={
                    <ProtectedRoute>
                      <RecentlyPlayedPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="category/:id"
                  element={
                    <ProtectedRoute>
                      <CategoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
          </Suspense>
        </div>
      </ErrorBoundary>
    </HashRouter>
  );
}

export default App;
