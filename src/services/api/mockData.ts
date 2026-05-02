import { User } from "src/types/auth";

export interface AuthResponse {
  user: User;
}

// Mock data for authentication
export const getMockAuthResponse = (): AuthResponse => ({
  user: {
    id: "1",
    name: "Sergio Cota",
    email: "test@example.com",
    roles: ["DESARROLLADOR"],
  } as User
});
