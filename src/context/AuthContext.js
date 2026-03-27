import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../config/supabase';
import { registerForPushNotifications } from '../utils/notifications';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    // Safety timeout: never stay on loading screen forever
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    checkUser().finally(() => clearTimeout(timeout));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setOnboarded(false);
      }
    });
    return () => {
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
    // Always stop loading regardless of what happens
    setLoading(false);
  };

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error.message);
        setOnboarded(false);
        return;
      }

      if (data) {
        setProfile(data);
        setOnboarded(!!data.bmi);
        try { registerForPushNotifications(userId).catch(() => {}); } catch (e) {}
      } else {
        setOnboarded(false);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signUp = async (email, password, fullName, extraFields = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          ...extraFields,
        },
      },
    });
    if (error) throw error;

    // Wait for the DB trigger to create the row, then update with extra fields
    if (data.user && Object.keys(extraFields).length > 0) {
      const userId = data.user.id;
      let retries = 0;
      while (retries < 10) {
        const { data: row } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        if (row) {
          await supabase
            .from('users')
            .update({ full_name: fullName, ...extraFields })
            .eq('id', userId);
          break;
        }
        retries++;
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
    setOnboarded(false);
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in');

    // Single upsert call — works whether row exists or not
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        ...updates,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    setProfile(data);
    if (data.bmi) setOnboarded(true);
    return data;
  };

  const value = {
    user,
    profile,
    loading,
    onboarded,
    signUp,
    signIn,
    signOut,
    updateProfile,
    fetchProfile,
    setOnboarded,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
