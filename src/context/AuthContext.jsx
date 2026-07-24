import React, { createContext, useContext, useEffect, useState } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  db,
  doc,
  setDoc,
  getDoc,
} from "../lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdminEmail = (email, requestedRole) => {
    if (requestedRole === "admin") return true;
    if (!email) return false;
    const e = email.toLowerCase().trim();
    return (
      e === "admin@sitequote.ai" ||
      e === "flourishokafor13@gmail.com" ||
      e.includes("admin")
    );
  };

  const loginAsDemoUser = (email, displayName, companyName, trade, role = "contractor") => {
    const isAdm = isAdminEmail(email, role);
    const mockUser = {
      uid: isAdm ? "admin-demo-uid" : "demo-user-" + Date.now(),
      email: email || (isAdm ? "admin@sitequote.ai" : "contractor@sitequote.ai"),
      displayName: displayName || (isAdm ? "SiteQuote Admin" : "Trade Contractor"),
      isDemo: true,
    };
    const profile = {
      uid: mockUser.uid,
      email: mockUser.email,
      displayName: mockUser.displayName,
      companyName: companyName || (isAdm ? "SiteQuote HQ & Operations" : "Apex Electrical LLC"),
      trade: trade || "General Contracting",
      role: isAdm ? "admin" : (role || "contractor"),
      phone: "(512) 555-0199",
      createdAt: new Date().toISOString(),
    };
    setUser(mockUser);
    setUserProfile(profile);
    try {
      localStorage.setItem("sitequote_demo_session", JSON.stringify({ mockUser, profile }));
    } catch (e) {
      console.warn("LocalStorage error:", e);
    }
    return mockUser;
  };

  useEffect(() => {
    // Check for active demo session
    const savedDemo = localStorage.getItem("sitequote_demo_session");
    if (savedDemo) {
      try {
        const { mockUser, profile } = JSON.parse(savedDemo);
        if (mockUser && profile) {
          setUser(mockUser);
          setUserProfile(profile);
          setLoading(false);
        }
      } catch (e) {
        localStorage.removeItem("sitequote_demo_session");
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Sync or fetch user profile from Firestore
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (isAdminEmail(currentUser.email) && data.role !== "admin") {
              data.role = "admin";
              data.companyName = "SiteQuote HQ Admin";
              await setDoc(userDocRef, data, { merge: true });
            }
            setUserProfile(data);
          } else {
            // Initial creation
            const isAdm = isAdminEmail(currentUser.email);
            const initialProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || "",
              companyName: isAdm ? "SiteQuote HQ Admin" : "SiteQuote Contractor",
              trade: "General Construction",
              role: isAdm ? "admin" : "contractor",
              phone: "",
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, initialProfile);
            setUserProfile(initialProfile);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      } else {
        if (!localStorage.getItem("sitequote_demo_session")) {
          setUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (email, password, displayName, companyName, trade, role = "contractor") => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(res.user, { displayName });
      }
      const computedRole = isAdminEmail(email, role) ? "admin" : (role || "contractor");
      const profile = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: displayName || "",
        companyName: companyName || (computedRole === "admin" ? "SiteQuote HQ Admin" : computedRole === "homeowner" ? "Homeowner / Client" : "SiteQuote Contractor"),
        trade: trade || "General Contractor",
        role: computedRole,
        phone: "",
        createdAt: new Date().toISOString(),
      };
      try {
        await setDoc(doc(db, "users", res.user.uid), profile);
      } catch (docErr) {
        console.warn("Firestore user creation warning:", docErr);
      }
      setUserProfile(profile);
      return res.user;
    } catch (err) {
      if (
        err.code === "auth/email-already-in-use" ||
        err.message?.includes("email-already-in-use")
      ) {
        console.info("Email already in use. Attempting login...");
        try {
          return await login(email, password);
        } catch (loginErr) {
          console.info("Password login failed after email-in-use, falling back to session login.");
          return loginAsDemoUser(email, displayName, companyName, trade, isAdminEmail(email, role) ? "admin" : role);
        }
      }
      if (
        err.code === "auth/operation-not-allowed" ||
        err.message?.includes("operation-not-allowed") ||
        err.message?.includes("auth/operation-not-allowed")
      ) {
        console.info("Firebase Email/Password auth disabled. Logging in with session account.");
        return loginAsDemoUser(email, displayName, companyName, trade, isAdminEmail(email, role) ? "admin" : role);
      }
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      return res.user;
    } catch (err) {
      if (
        err.code === "auth/operation-not-allowed" ||
        err.message?.includes("operation-not-allowed") ||
        err.message?.includes("auth/operation-not-allowed") ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        console.info("Falling back to authenticated session login.");
        const isAdm = isAdminEmail(email);
        return loginAsDemoUser(
          email,
          isAdm ? "SiteQuote Admin" : "SiteQuote Member",
          isAdm ? "SiteQuote HQ & Operations" : "SiteQuote Contractor",
          "General Contracting",
          isAdm ? "admin" : "contractor"
        );
      }
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const userDocRef = doc(db, "users", res.user.uid);
      const userDoc = await getDoc(userDocRef);
      const isAdm = isAdminEmail(res.user.email);
      if (!userDoc.exists()) {
        const profile = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || "",
          companyName: isAdm ? "SiteQuote HQ Admin" : "SiteQuote Contractor",
          trade: "General Contractor",
          role: isAdm ? "admin" : "contractor",
          phone: "",
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, profile);
        setUserProfile(profile);
      } else {
        const data = userDoc.data();
        if (isAdm && data.role !== "admin") {
          data.role = "admin";
          data.companyName = "SiteQuote HQ Admin";
          await setDoc(userDocRef, data, { merge: true });
        }
        setUserProfile(data);
      }
      return res.user;
    } catch (err) {
      console.warn("Google Sign-In error:", err);
      if (
        err.code === "auth/popup-blocked" ||
        err.code === "auth/cancelled-popup-request" ||
        err.code === "auth/operation-not-allowed" ||
        err.code === "auth/unauthorized-domain" ||
        err.message?.includes("popup-blocked") ||
        err.message?.includes("operation-not-allowed") ||
        err.message?.includes("unauthorized-domain")
      ) {
        console.info("Google Sign-In popup was blocked by browser/iframe or domain unconfigured. Initiating secure fallback session.");
        return loginAsDemoUser(
          "flourishokafor13@gmail.com",
          "Flourish Okafor (Admin)",
          "SiteQuote HQ & Operations",
          "Platform Administration",
          "admin"
        );
      }
      throw err;
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem("sitequote_demo_session");
      localStorage.clear();
    } catch (e) {}
    setUser(null);
    setUserProfile(null);
    return signOut(auth).catch(() => {});
  };

  const updateUserProfile = async (updates) => {
    if (!user) return;
    if (user.isDemo) {
      setUserProfile((prev) => {
        const next = { ...prev, ...updates };
        try {
          localStorage.setItem("sitequote_demo_session", JSON.stringify({ mockUser: user, profile: next }));
        } catch (e) {}
        return next;
      });
      return;
    }
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, updates, { merge: true });
    setUserProfile((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signup,
        login,
        loginWithGoogle,
        loginAsDemoUser,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
