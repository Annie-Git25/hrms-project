//src/context/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient'; // Make sure this path is correct

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Fetch user role from profiles table
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error("Error fetching user role:", error);
                    setSession({ user: session.user, role: 'unknown' }); // Fallback
                } else if (profile) {
                    setSession({ user: session.user, role: profile.role });
                } else {
                    setSession({ user: session.user, role: 'employee' }); // Default if no profile initially
                }
            } else {
                setSession(null);
            }
            setLoading(false);
        };

        getSession();

        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, currentSession) => {
                if (currentSession) {
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', currentSession.user.id)
                        .single();

                    if (error) {
                        console.error("Error fetching user role on auth change:", error);
                        setSession({ user: currentSession.user, role: 'unknown' });
                    } else if (profile) {
                        setSession({ user: currentSession.user, role: profile.role });
                    } else {
                        setSession({ user: currentSession.user, role: 'employee' }); // Default
                    }
                } else {
                    setSession(null);
                }
                setLoading(false); // Make sure to set loading to false after any change
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ session, loading, setSession, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
