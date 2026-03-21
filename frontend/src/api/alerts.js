import api from '../lib/axios.js'

export const listAlerts = (params) =>
  api.get('/alerts/', { params }).then((r) => r.data)

export const getAlert = (id) =>
  api.get(`/alerts/${id}/`).then((r) => r.data)

export const acknowledgeAlert = (id) =>
  api.post(`/alerts/${id}/acknowledge/`).then((r) => r.data)

export const resolveAlert = (id, resolution_note = '') =>
  api.post(`/alerts/${id}/resolve/`, { resolution_note }).then((r) => r.data)
