import api from '../lib/axios.js'

export const listIncidents = (params) =>
  api.get('/incidents/', { params }).then((r) => r.data)

export const createIncident = (data) =>
  api.post('/incidents/', data).then((r) => r.data)

export const getIncident = (id) =>
  api.get(`/incidents/${id}/`).then((r) => r.data)

export const updateIncident = (id, data) =>
  api.patch(`/incidents/${id}/`, data).then((r) => r.data)

export const addNote = (id, data) =>
  api.post(`/incidents/${id}/add_note/`, data).then((r) => r.data)

export const linkAlert = (id, alertId) =>
  api.post(`/incidents/${id}/link_alert/`, { alert_id: alertId }).then((r) => r.data)

export const resolveIncident = (id) =>
  api.post(`/incidents/${id}/resolve/`).then((r) => r.data)
