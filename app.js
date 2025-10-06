import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail, 
  signInWithPopup, 
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Firebase Configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB_RuCtCsxbNYDv-LE7SVF_0FiU4VjwQME",
  authDomain: "gps2quantum-prod-platform.firebaseapp.com",
  projectId: "gps2quantum-prod-platform",
  storageBucket: "gps2quantum-prod-platform.firebasestorage.app",
  messagingSenderId: "506830622318",
  appId: "1:506830622318:web:8982f1557a93a3ea7b207f",
  measurementId: "G-V4H4X9KB78"
};

// Backend Configuration
const BACKEND_ROOT = "https://gps2quantum-backend-506830622318.us-central1.run.app/";
const SESSION_LOGIN_URL = BACKEND_ROOT + "sessionLogin";

console.log("=== GPS2Quantum app.js loading ===");

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);

// Set persistence
setPersistence(auth, browserLocalPersistence).catch(console.warn);

// DOM helpers
const $ = (id) => document.getElementById(id);
const emailEl = $("email");
const passEl = $("password");
const msgEl = $("msg");

console.log("DOM elements found:", {
  email: !!emailEl,
  password: !!passEl,
  msg: !!msgEl
});

// UI helpers
const setLoading = (btn, loading) => {
  if (loading) {
    btn.disabled = true;
    btn.dataset.original = btn.textContent;
    btn.innerHTML = '<span class="loading"></span>' + btn.textContent;
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.original || btn.textContent.replace('...', '');
  }
};

const ok = (t) => { msgEl.textContent = t; msgEl.className = "msg ok"; };
const err = (t) => { msgEl.textContent = t; msgEl.className = "msg err"; };
const info = (t) => { msgEl.textContent = t; msgEl.className = "msg muted"; };

// Token storage
const storeToken = (token) => {
  try {
    sessionStorage.setItem("gps2q_idtoken", token);
    localStorage.setItem("gps2q_idtoken", token);
    console.log("Token stored successfully");
  } catch (e) {
    console.warn("Failed to store token:", e);
  }
};

// Session setup and redirect
async function setCookieAndGo(idToken) {
  console.log("=== SET COOKIE AND GO START ===");
  
  // Store token in GitHub Pages storage
  storeToken(idToken);
  console.log("Token stored in localStorage/sessionStorage");
  
  // Try to set backend cookie
  try {
    console.log("Calling sessionLogin endpoint:", SESSION_LOGIN_URL);
    const response = await fetch(SESSION_LOGIN_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ idToken })
    });

    console.log("sessionLogin response status:", response.status);

    if (!response.ok) {
      console.warn("Cookie set failed, using token-based auth");
    } else {
      console.log("Cookie set successfully");
    }
  } catch (e) {
    console.warn("Cookie request failed:", e);
  }

  // Redirect with token in URL so backend can store it
  console.log("About to redirect to:", BACKEND_ROOT);
  window.location.replace(BACKEND_ROOT + '?id_token=' + encodeURIComponent(idToken));
  console.log("window.location.replace() called");
}

// Post-login handler
async function postLogin(user) {
  try {
    console.log("=== POST LOGIN START ===");
    console.log("User email:", user.email);
    console.log("User UID:", user.uid);
    
    info("Setting up session...");
    const idToken = await user.getIdToken(true);
    console.log("Got ID token, length:", idToken.length);
    
    await setCookieAndGo(idToken);
    console.log("setCookieAndGo completed");
    
    ok("Success! Redirecting...");
  } catch (e) {
    console.error("Post-login error:", e);
    err(e.message || "Login failed");
  }
}

// Sign In handler
$("btnSignIn").addEventListener("click", async () => {
  console.log("=== SIGN IN BUTTON CLICKED ===");
  
  const email = emailEl.value.trim();
  const password = passEl.value;
  
  console.log("Email:", email);
  console.log("Password length:", password.length);
  
  if (!email || !password) {
    console.log("Validation failed: missing email or password");
    err("Please enter both email and password");
    return;
  }

  const btn = $("btnSignIn");
  setLoading(btn, true);
  info("Signing in...");
  
  try {
    console.log("Calling Firebase signInWithEmailAndPassword...");
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    console.log("Firebase authentication SUCCESS");
    console.log("User:", user.email, user.uid);
    
    await postLogin(user);
  } catch (e) {
    console.error("Sign in error:", e);
    console.error("Error code:", e.code);
    console.error("Error message:", e.message);
    err(e.message || "Sign in failed");
    setLoading(btn, false);
  }
});

// Sign Up handler
$("btnSignUp").addEventListener("click", async () => {
  console.log("=== SIGN UP BUTTON CLICKED ===");
  
  const email = emailEl.value.trim();
  const password = passEl.value;
  
  console.log("Email:", email);
  console.log("Password length:", password.length);
  
  if (!email || !password) {
    console.log("Validation failed: missing email or password");
    err("Please enter both email and password");
    return;
  }

  if (password.length < 6) {
    console.log("Validation failed: password too short");
    err("Password must be at least 6 characters");
    return;
  }

  const btn = $("btnSignUp");
  setLoading(btn, true);
  info("Creating account...");
  
  try {
    console.log("Calling Firebase createUserWithEmailAndPassword...");
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Account creation SUCCESS");
    console.log("User:", user.email, user.uid);
    
    await postLogin(user);
  } catch (e) {
    console.error("Sign up error:", e);
    console.error("Error code:", e.code);
    console.error("Error message:", e.message);
    err(e.message || "Account creation failed");
    setLoading(btn, false);
  }
});

// Google Sign In handler
$("btnGoogle").addEventListener("click", async () => {
  console.log("=== GOOGLE SIGN IN BUTTON CLICKED ===");
  
  const btn = $("btnGoogle");
  setLoading(btn, true);
  info("Authenticating with Google...");
  
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    console.log("Opening Google sign-in popup...");
    const { user } = await signInWithPopup(auth, provider);
    console.log("Google authentication SUCCESS");
    console.log("User:", user.email, user.uid);
    
    await postLogin(user);
  } catch (e) {
    console.error("Google auth error:", e);
    console.error("Error code:", e.code);
    console.error("Error message:", e.message);
    
    if (e.code !== 'auth/popup-closed-by-user') {
      err(e.message || "Google authentication failed");
    }
    setLoading(btn, false);
  }
});

// Password Reset handler
$("linkReset").addEventListener("click", async (ev) => {
  ev.preventDefault();
  console.log("=== PASSWORD RESET CLICKED ===");
  
  const email = emailEl.value.trim();
  
  console.log("Email:", email);
  
  if (!email) {
    console.log("Validation failed: no email");
    err("Enter your email first");
    return;
  }

  info("Sending reset email...");
  
  try {
    console.log("Calling Firebase sendPasswordResetEmail...");
    await sendPasswordResetEmail(auth, email);
    console.log("Password reset email sent successfully");
    ok("Password reset email sent");
  } catch (e) {
    console.error("Password reset error:", e);
    console.error("Error code:", e.code);
    console.error("Error message:", e.message);
    err(e.message || "Failed to send reset email");
  }
});

// Enter key support
[emailEl, passEl].forEach(input => {
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      console.log("Enter key pressed, triggering sign in");
      $("btnSignIn").click();
    }
  });
});

// Confirm script loaded
console.log("=== GPS2Quantum login script loaded successfully ===");