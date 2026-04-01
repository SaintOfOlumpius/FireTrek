import api from '../lib/axios.js'  // your axios instance

export const listFences = (params) =>
  api.get('/geofencing/fences/', { params }).then((r) => r.data)

export const getFence = (id) =>
  api.get(`/geofencing/fences/${id}/`).then((r) => r.data)

export const createFence = (data) =>
  api.post('/geofencing/fences/', data).then((r) => r.data)

export const updateFence = (id, data) =>
  api.patch(`/geofencing/fences/${id}/`, data).then((r) => r.data)

export const deleteFence = (id) =>
  api.delete(`/geofencing/fences/${id}/`).then((r) => r.data)

export const toggleFence = (id) =>
  api.patch(`/geofencing/fences/${id}/toggle/`).then((r) => r.data)

export const listFenceEvents = (id) =>
  api.get(`/geofencing/fences/${id}/events/`).then((r) => r.data)

export const listAssignments = (params) =>
  api.get('/geofencing/assignments/', { params }).then((r) => r.data)

export const createAssignment = (data) =>
  api.post('/geofencing/assignments/', data).then((r) => r.data)

export const deleteAssignment = (id) =>
  api.delete(`/geofencing/assignments/${id}/`).then((r) => r.data)

export const listEvents = (params) =>
  api.get('/geofencing/events/', { params }).then((r) => r.data)