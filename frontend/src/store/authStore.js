import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEV_USER = {
  id: 'dev-001',
  email: 'dev@firetrek.io',
  first_name: 'Dev',
  last_name: 'User',
  role: 'admin',
}

const DEV_ORG = {
  id: 'org-001',
  name: 'Dev Organization',
  slug: 'dev-org',
}

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeOrg: null,

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setActiveOrg: (org) => set({ activeOrg: org }),

      login: (user, accessToken, refreshToken, activeOrg = null) =>
        set({ user, accessToken, refreshToken, activeOrg }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, activeOrg: null }),

      isAuthenticated: () => !!useAuthStore.getState().accessToken,

      devLogin: () => {
        if (import.meta.env.DEV) {
          set({
            user: DEV_USER,
            accessToken: 'dev-access-token',
            refreshToken: 'dev-refresh-token',
            activeOrg: DEV_ORG,
          })
        }
      },
    }),
    {
      name: 'firetrek-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        activeOrg: state.activeOrg,
      }),
    },
  ),
)