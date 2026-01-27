export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthResponse = {
  token?: string;
  user?: {
    id: string;
    name?: string;
    email: string;
  };
  message?: string;
};
