import api from '../lib/axios.js'

export const listFirearms = (params) =>
  api.get('/firearms/', { params }).then((r) => r.data)

export const createFirearm = (data) =>
  api.post('/firearms/', data).then((r) => r.data)

export const getFirearm = (id) =>
  api.get(`/firearms/${id}/`).then((r) => r.data)

export const updateFirearm = (id, data) =>
  api.patch(`/firearms/${id}/`, data).then((r) => r.data)

export const deleteFirearm = (id) =>
  api.delete(`/firearms/${id}/`).then((r) => r.data)

export const listCategories = () =>
  api.get('/firearms/categories/').then((r) => r.data)

export const createCategory = (data) =>
  api.post('/firearms/categories/', data).then((r) => r.data)

export const deleteCategory = (id) =>
  api.delete(`/firearms/categories/${id}/`).then((r) => r.data)
