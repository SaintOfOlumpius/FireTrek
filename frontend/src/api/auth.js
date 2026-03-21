import api from '../lib/axios.js'

export const login = (email, password) =>
  api.post('/auth/token/', { email, password }).then((r) => r.data)

export const refreshToken = (refresh) =>
  api.post('/auth/token/refresh/', { refresh }).then((r) => r.data)

export const register = (data) =>
  api.post('/accounts/register/', data).then((r) => r.data)

export const getMe = () =>
  api.get('/accounts/me/').then((r) => r.data)

export const updateMe = (data) =>
  api.patch('/accounts/me/', data).then((r) => r.data)

export const changePassword = (data) =>
  api.post('/accounts/me/change-password/', data).then((r) => r.data)
