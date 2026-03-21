import api from '../lib/axios.js'

export const listVersions = (params) =>
  api.get('/firmware/versions/', { params }).then((r) => r.data)

export const createVersion = (formData) =>
  api.post('/firmware/versions/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)

export const deleteVersion = (id) =>
  api.delete(`/firmware/versions/${id}/`).then((r) => r.data)

export const listDeployments = (params) =>
  api.get('/firmware/deployments/', { params }).then((r) => r.data)

export const createDeployment = (data) =>
  api.post('/firmware/deployments/', data).then((r) => r.data)

export const cancelDeployment = (id) =>
  api.post(`/firmware/deployments/${id}/cancel/`).then((r) => r.data)
