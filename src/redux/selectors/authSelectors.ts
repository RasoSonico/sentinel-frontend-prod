import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";

// Selectores base
export const selectAuthState = (state: RootState) => state.auth;
export const selectToken = (state: RootState) => state.auth.token;
export const selectRole = (state: RootState) => state.auth.role;
export const selectUser = (state: RootState) => state.auth.user;
export const selectLoading = (state: RootState) => state.auth.loading;
export const selectError = (state: RootState) => state.auth.error;

// Selectores derivados
export const selectIsAuthenticated = createSelector(
  [selectToken],
  (token) => !!token
);

export const selectUserId = createSelector([selectUser], (user) => user?.id);

export const selectUserEmail = createSelector(
  [selectUser],
  (user) => user?.email
);

export const selectUserName = createSelector(
  [selectUser],
  (user) => user?.name
);

// Selectores de roles
export const selectIsAdmin = createSelector([selectUser], (user) =>
  user?.roles.includes("ADMIN")
);

export const selectIsDesarrollador = createSelector([selectUser], (user) =>
  user?.roles.includes("DESARROLLADOR")
);

export const selectIsContratista = createSelector([selectUser], (user) =>
  user?.roles.includes("CONTRATISTA")
);

export const selectIsInversionista = createSelector([selectUser], (user) =>
  user?.roles.includes("INVERSIONISTA")
);

export const selectIsInspector = createSelector([selectUser], (user) =>
  user?.roles.includes("INSPECTOR")
);

// Selector combinado
export const selectAuthInfo = createSelector(
  [selectToken, selectRole, selectUser, selectIsAuthenticated],
  (token, role, user, isAuthenticated) => ({
    isAuthenticated,
    role,
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
    userRoles: user?.roles || [],
    token,
    user,
  })
);