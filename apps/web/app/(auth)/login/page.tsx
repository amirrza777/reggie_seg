'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      console.log('Login:', email);
      setIsLoading(false);
    }, 1000);
  };

  const handleGoogleLogin = () => {
    console.log("Google Login Clicked");
    // AUTH BACKEND LINK !!!
  };

  return (
    <div className="auth-card">
      <h1 className="auth-title">Team Feedback</h1>
      <p className="auth-subtitle">
        Sign in to access your peer assessments <br /> and meeting minutes.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email address</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            placeholder="name@kcl.ac.uk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="auth-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="auth-btn-primary" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>

        <button 
          type="button" 
          className="auth-btn-google" 
          onClick={handleGoogleLogin}
        >
          <span style={{ fontWeight: 700 }}>G</span> Sign in with Google
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="auth-link">
            Get started
          </Link>
        </p>
        <a href="#" className="auth-link auth-link--subtle">
          Forgot password?
        </a>
      </div>
    </div>
  );
}
