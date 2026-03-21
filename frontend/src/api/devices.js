import api from '../lib/axios.js'

export const listDevices = (params) =>
  api.get('/devices/', { params }).then((r) => r.data)

export const getDevice = (id) =>
  api.get(`/devices/${id}/`).then((r) => r.data)

export const updateDevice = (id, data) =>
  api.patch(`/devices/${id}/`, data).then((r) => r.data)

export const deleteDevice = (id) =>
  api.delete(`/devices/${id}/`).then((r) => r.data)

export const provisionDevice = (data) =>
  api.post('/devices/provision/', data).then((r) => r.data)

export const getDeviceHealth = (id) =>
  api.get(`/devices/${id}/health/`).then((r) => r.data)

export const deactivateDevice = (id) =>
  api.post(`/devices/${id}/deactivate/`).then((r) => r.data)
