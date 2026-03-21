import api from '../lib/axios.js'

export const getLocationHistory = (deviceId, params) =>
  api.get(`/telemetry/devices/${deviceId}/history/`, { params }).then((r) => r.data)
