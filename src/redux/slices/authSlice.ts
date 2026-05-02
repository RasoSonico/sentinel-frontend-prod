import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "../../types/auth";

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  token?: string | null;
  role?: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  token: null,
  role: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User | null;
      }>
    ) => {
      state.user = action.payload.user;
      state.loading = false;
      state.error = null;
    },
    setIsAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
      state.loading = false;
      state.error = null;
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
      state.error = null;
      state.token = null;
      state.role = null;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const {
  setCredentials,
  setLoading,
  setError,
  logout,
  clearCredentials,
  setIsAuthenticated,
  setToken,
} = authSlice.actions;
export default authSlice.reducer;