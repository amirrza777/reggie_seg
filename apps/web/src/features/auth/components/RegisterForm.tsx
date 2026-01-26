'use client';

import { useState } from 'react';

export function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      console.log('Registering:', formData);
      setIsLoading(false);
    }, 1000);
  };

  const handleGoogleRegister = () => {
    console.log("Google Register Clicked");
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <div className="auth-field">
        <label className="auth-label" htmlFor="name">Full Name</label>
        <input
          id="name"
          className="auth-input"
          type="text"
          placeholder="" 
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="email">Email address</label>
        <input
          id="email"
          className="auth-input"
          type="email"
          placeholder="" 
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="password">Password</label>
        <input
          id="password"
          className="auth-input"
          type="password"
          placeholder="" 
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          minLength={8}
        />
      </div>

      <button type="submit" className="auth-btn-primary" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Create account'}
      </button>

      <button 
        type="button" 
        className="auth-btn-google" 
        onClick={handleGoogleRegister}
      >
        <span style={{ fontWeight: 700 }}>G</span> Sign up with Google
      </button>
    </form>
  );
}