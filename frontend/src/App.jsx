import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import '@fontsource/fira-code'; // Assuming this is for a specific font, keep as is

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    // Added Tailwind CSS classes:
    // flex: Use flexbox for layout
    // flex-col: Arrange children vertically
    // min-h-screen: Ensure it takes at least the full viewport height
    // w-screen: Ensure it takes the full viewport width
    // bg-gray-50: A light background for the entire app (optional, but good for visual consistency)
    // font-inter: Apply the Inter font globally (assuming you've imported it in index.css)
    <div className="flex flex-col min-h-screen w-screen bg-gray-50 font-inter">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </div>
  );
}

export default App;
