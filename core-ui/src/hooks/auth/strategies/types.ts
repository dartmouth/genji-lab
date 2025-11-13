export interface AuthStrategy {
  name: string;
  error: string | null;
  setError: (error: string | null) => void;
}

export interface BasicAuthStrategy extends AuthStrategy {
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
}

export interface CASAuthStrategy extends AuthStrategy {
  login: () => void;
  checkForTicket: () => Promise<void>;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
}