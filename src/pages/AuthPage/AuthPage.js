//src/pages/AuthPage/AuthPage.js

import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient'; // Make sure this path is correct
import styles from './AuthPage.module.css';

const AuthPage = ({ setAuthSession }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isLogin, setIsLogin] = useState(true); // Toggle between login and signup (optional for HRMS)

    const handleAuth = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error } = isLogin
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({ email, password });

            if (error) throw error;

            if (data.user) {
                // Fetch user role after successful login
                const { data: profile, error: profileError } = await supabase
                    .from('profiles') // Assuming you have a 'profiles' table with 'role'
                    .select('role')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) throw profileError;

                if (profile) {
                    setAuthSession({ user: data.user, role: profile.role });
                } else {
                    // Handle case where profile is not found (e.g., new user without role)
                    setError('User profile not found. Please contact HR.');
                    await supabase.auth.signOut(); // Log out user if no profile
                }
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred.');
            console.error('Authentication error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authContainer}>
            <h2>{isLogin ? 'Login' : 'Sign Up'} to HRMS</h2>
            <form onSubmit={handleAuth} className={styles.authForm}>
                <div className={styles.formGroup}>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
                </button>
            </form>
            {/* Optional: Toggle for Login/Sign Up if applicable for your HRMS */}
            {/* <p>
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <span onClick={() => setIsLogin(!isLogin)} className={styles.toggleLink}>
                    {isLogin ? 'Sign Up' : 'Login'}
                </span>
            </p> */}
        </div>
    );
};

export default AuthPage;
