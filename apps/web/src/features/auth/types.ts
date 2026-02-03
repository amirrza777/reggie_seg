export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthResponse = {
  accessToken?: string;
  message?: string;
};
