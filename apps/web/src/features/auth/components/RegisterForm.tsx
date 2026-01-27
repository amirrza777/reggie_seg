'use client';

import { useState } from 'react';
import { AuthField } from './AuthField';

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
      <AuthField
        name="name"
        label="Full Name"
        type="text"
        value={formData.name}
        required
        onChange={(name, value) => setFormData({ ...formData, [name]: value })}
      />

      <AuthField
        name="email"
        label="Email address"
        type="email"
        value={formData.email}
        required
        onChange={(name, value) => setFormData({ ...formData, [name]: value })}
      />

      <AuthField
        name="password"
        label="Password"
        type="password"
        value={formData.password}
        required
        minLength={8}
        onChange={(name, value) => setFormData({ ...formData, [name]: value })}
      />

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
