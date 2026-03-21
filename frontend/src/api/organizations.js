import api from '../lib/axios.js'

export const listOrganizations = () =>
  api.get('/organizations/').then((r) => r.data)

export const createOrganization = (data) =>
  api.post('/organizations/', data).then((r) => r.data)

export const getOrganization = (id) =>
  api.get(`/organizations/${id}/`).then((r) => r.data)

export const updateOrganization = (id, data) =>
  api.patch(`/organizations/${id}/`, data).then((r) => r.data)

export const deleteOrganization = (id) =>
  api.delete(`/organizations/${id}/`).then((r) => r.data)

export const listMembers = (orgId) =>
  api.get(`/organizations/${orgId}/members/`).then((r) => r.data)

export const addMember = (orgId, data) =>
  api.post(`/organizations/${orgId}/members/`, data).then((r) => r.data)

export const updateMember = (orgId, memberId, data) =>
  api.patch(`/organizations/${orgId}/members/${memberId}/`, data).then((r) => r.data)

export const removeMember = (orgId, memberId) =>
  api.delete(`/organizations/${orgId}/members/${memberId}/`).then((r) => r.data)

export const listInvitations = (orgId) =>
  api.get(`/organizations/${orgId}/invitations/`).then((r) => r.data)

export const sendInvitation = (orgId, data) =>
  api.post(`/organizations/${orgId}/invitations/`, data).then((r) => r.data)

export const deleteInvitation = (orgId, invId) =>
  api.delete(`/organizations/${orgId}/invitations/${invId}/`).then((r) => r.data)
