import React, { createContext, useState, useEffect, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration (Use environment variables for production)
// You should define these in a .env file at your project root:
// VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
// VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_PUBLIC_KEY"
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create the Auth Context
const AuthContext = createContext(null);

// Custom hook to use the Auth Context
export const useAuth = () => useContext(AuthContext);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null); // Stores the full user object
  const [loading, setLoading] = useState(true); // Loading state for initial session check
  const [currentUserRole, setCurrentUserRole] = useState('employee'); // Default role

  // Function to display messages (similar to your old showMessage)
  const showTemporaryMessage = (message, isError = true) => {
    // In a real app, you'd use a state management for a global message component
    // For now, we'll just log it or you can implement a simple modal/toast
    console.log(`Message (${isError ? 'Error' : 'Success'}): ${message}`);
    // Example: You could dispatch an event or update a global state here
  };

  // Function to ensure employee record exists and fetch role
  const ensureEmployeeRecord = async (supabaseUser) => {
    if (!supabaseUser) {
      setCurrentUserRole('employee'); // Reset role if no user
      setUser(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*, position:positions("title"), department:departments("name")')
        .eq('user_id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
        throw error;
      }

      if (data) {
        console.log("Employee record found:", data);
        setCurrentUserRole(data.role || 'employee'); // Set role from DB, default to 'employee'
        setUser({ ...supabaseUser, employeeData: data }); // Store user with employee details
      } else {
        console.log("No employee record found for user. Creating one...");
        await createEmployeeRecordForNewUser(supabaseUser);
      }
    } catch (error) {
      console.error("Error ensuring employee record:", error.message);
      showTemporaryMessage(`Error: ${error.message}`, true);
      setCurrentUserRole('employee'); // Fallback role on error
      setUser(supabaseUser); // Still set user, but without employee data
    }
  };

  // Function to create employee record for new users
  const createEmployeeRecordForNewUser = async (supabaseUser) => {
    if (!supabaseUser) return;

    try {
      const [firstNamePart, lastNamePart] = supabaseUser.email.split('@')[0].split('.');
      const firstName = firstNamePart ? firstNamePart.charAt(0).toUpperCase() + firstNamePart.slice(1) : 'New';
      const lastName = lastNamePart ? lastNamePart.charAt(0).toUpperCase() + lastNamePart.slice(1) : 'User';

      const { data, error } = await supabase
        .from('employees')
        .insert([
          {
            user_id: supabaseUser.id,
            email: supabaseUser.email,
            firstName: firstName,
            lastName: lastName,
            hireDate: new Date().toISOString().split('T')[0],
            status: 'Active',
            role: 'employee', // Default role for new registrations
          }
        ])
        .select()
        .single();

      if (error) throw error;
      console.log("New employee record created:", data);
      setCurrentUserRole(data.role || 'employee');
      setUser({ ...supabaseUser, employeeData: data });
      showTemporaryMessage("Employee record created successfully!", false);
    } catch (error) {
      console.error("Error creating employee record:", error.message);
      showTemporaryMessage(`Error creating employee record: ${error.message}`, true);
      setCurrentUserRole('employee'); // Fallback role on error
      setUser(supabaseUser);
    }
  };

  // Supabase Auth State Change Listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`Supabase auth event: ${event}`, currentSession);
      if (currentSession) {
        setSession(currentSession);
        await ensureEmployeeRecord(currentSession.user);
      } else {
        setSession(null);
        setUser(null);
        setCurrentUserRole('employee'); // Reset role on sign out
      }
      setLoading(false); // Authentication state is ready
    });

    // Initial session check on mount
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (initialSession) {
          setSession(initialSession);
          await ensureEmployeeRecord(initialSession.user);
        }
      } catch (error) {
        console.error("Error getting initial session:", error.message);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Cleanup listener on unmount
    return () => {
      authListener.unsubscribe();
    };
  }, []); // Empty dependency array means this runs once on mount

  // Authentication methods
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session);
      await ensureEmployeeRecord(data.user);
      showTemporaryMessage("Login successful!", false);
      return { success: true };
    } catch (error) {
      console.error("Login error:", error.message);
      showTemporaryMessage(error.message || "An unexpected error occurred. Please try again.", true);
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // For sign-up, user needs to confirm email first, session might not be immediate
      // We'll create the employee record immediately but prompt for email confirmation
      await createEmployeeRecordForNewUser(data.user); // Create record even if email not confirmed
      showTemporaryMessage("Registration successful! Please check your email to confirm your account and then log in.", false);
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error.message);
      showTemporaryMessage(error.message || "An unexpected error occurred. Please try again.", true);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
      setCurrentUserRole('employee');
      showTemporaryMessage("Logged out successfully!", false);
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error.message);
      showTemporaryMessage(error.message || "Failed to log out.", true);
      return { success: false, error: error.message };
    }
  };

  const value = {
    session,
    user, // The full user object with employeeData
    loading,
    currentUserRole,
    signIn,
    signUp,
    signOut,
    supabase // Expose supabase client if needed directly
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
