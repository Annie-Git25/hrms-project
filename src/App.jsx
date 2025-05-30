//src/App.js

import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage/AuthPage.jsx';
import EmployeeDashboard from './pages/Dashboard/EmployeeDashboard.jsx';
import HrAdminDashboard from './pages/Dashboard/HrAdminDashboard.jsx';
import './App.css'; // Global CSS for body/html

// PrivateRoute component to protect routes based on authentication and role
const PrivateRoute = ({ children, allowedRoles }) => {
    const { session, loading } = useContext(AuthContext);

    if (loading) {
        return <div className="loading-app">Loading application...</div>;
    }

    if (!session) {
        return <Navigate to="/" replace />; // Redirect to login if not authenticated
    }

    if (allowedRoles && !allowedRoles.includes(session.role)) {
        return <Navigate to="/unauthorized" replace />; // Redirect if not authorized
    }

    return children;
};

// Unauthorized Page (optional)
const UnauthorizedPage = () => (
    <div className="unauthorized-container">
        <h1>Unauthorized Access</h1>
        <p>You do not have permission to view this page.</p>
        <a href="/">Go to Login</a>
    </div>
);


function App() {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    );
}

function AppContent() {
    const { session, loading, logout, setSession } = useContext(AuthContext);

    // Render nothing or a loading spinner if session is still loading
    if (loading) {
        return <div className="loading-app">Loading authentication...</div>;
    }

    return (
        <>
            <header className="app-header">
                <nav className="navbar">
                    <div className="navbar-brand">HRMS</div>
                    {session && (
                        <div className="navbar-links">
                            <span>Logged in as: {session.user?.email} ({session.role})</span>
                            <button onClick={logout} className="logout-button">Logout</button>
                        </div>
                    )}
                </nav>
            </header>
            <main className="app-main">
                <Routes>
                    <Route
                        path="/"
                        element={
                            session ? (
                                session.role === 'hr_admin' ? (
                                    <Navigate to="./HrAdminDashboard.jsx" replace />
                                ) : (
                                    <Navigate to="./EmployeeDashboard.jsx" replace />
                                )
                            ) : (
                                <AuthPage setAuthSession={setSession} />
                            )
                        }
                    />
                    <Route
                        path="./EmployeeDashboard.jsx"
                        element={
                            <PrivateRoute allowedRoles={['employee', 'hrAdmin']}> {/* HR can also see employee dashboard */}
                                <EmployeeDashboard />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="./HrAdminDashboard.jsx"
                        element={
                            <PrivateRoute allowedRoles={['hrAdmin']}>
                                <HrAdminDashboard />
                            </PrivateRoute>
                        }
                    />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />
                    {/* Add other protected routes here later, e.g., /training, /performance */}
                    <Route path="*" element={<Navigate to="/" replace />} /> {/* Catch-all for undefined routes */}
                </Routes>
            </main>
        </>
    );
}

export default App;
