import api from '../lib/axios.js'

export const listNotifications = (params) =>
  api.get('/notifications/', { params }).then((r) => r.data)

export const markRead = (id) =>
  api.post(`/notifications/${id}/mark_read/`).then((r) => r.data)

export const markAllRead = () =>
  api.post('/notifications/mark_all_read/').then((r) => r.data)

export const listPreferences = () =>
  api.get('/notifications/preferences/').then((r) => r.data)

export const updatePreference = (id, data) =>
  api.patch(`/notifications/preferences/${id}/`, data).then((r) => r.data)

export const createPreference = (data) =>
  api.post('/notifications/preferences/', data).then((r) => r.data)
