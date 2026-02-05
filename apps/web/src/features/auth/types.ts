export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthResponse = {
  accessToken?: string;
  message?: string;
};

export type UserProfile = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  avatarBase64?: string | null;
  avatarMime?: string | null;
};
