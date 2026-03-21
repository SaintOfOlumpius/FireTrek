import api from '../lib/axios.js'

export const listAuditLogs = (params) =>
  api.get('/audit/logs/', { params }).then((r) => r.data)

export const getAuditLog = (id) =>
  api.get(`/audit/logs/${id}/`).then((r) => r.data)
