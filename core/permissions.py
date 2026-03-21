"""
Role-based access control for FireTrek.

Design rationale:
- Roles are stored per-membership (User ↔ Organisation) rather than globally.
  This allows the same user to be an admin in Org A and a viewer in Org B.
- Permissions are checked at the object level in DRF ViewSets so that tenant
  isolation is enforced consistently regardless of how a view is written.
- IsDeviceAuthenticated checks that request.auth is a Device instance, which
  is set by DeviceAPIKeyAuthentication.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsDeviceAuthenticated(BasePermission):
    """Allow access only to authenticated IoT devices."""

    message = "Device API key required."

    def has_permission(self, request, view):
        from apps.devices.models import Device
        return isinstance(request.auth, Device)


class IsSameOrganization(BasePermission):
    """Ensure the authenticated user belongs to the object's organisation."""

    message = "You do not have access to this organisation's resources."

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        org_id = getattr(obj, "organization_id", None)
        if org_id is None and hasattr(obj, "organization"):
            org_id = obj.organization_id
        return request.user.memberships.filter(organization_id=org_id, is_active=True).exists()


class IsOrgAdmin(BasePermission):
    """Allow write access only to org admins; read access to all org members."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        org_id = view.kwargs.get("organization_pk") or request.data.get("organization")
        if not org_id:
            return True  # Object-level permission will handle it
        return _has_role(request.user, org_id, ("admin", "owner"))

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return IsSameOrganization().has_object_permission(request, view, obj)
        org_id = getattr(obj, "organization_id", None)
        return _has_role(request.user, org_id, ("admin", "owner"))


class IsOrgOwner(BasePermission):
    """Restrict to organisation owners only (e.g. billing, deletion)."""

    def has_object_permission(self, request, view, obj):
        org_id = getattr(obj, "organization_id", obj.pk if hasattr(obj, "slug") else None)
        return _has_role(request.user, org_id, ("owner",))


class IsOrgMember(BasePermission):
    """Allow any authenticated member of the same organisation."""

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return IsSameOrganization().has_object_permission(request, view, obj)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _has_role(user, org_id, roles) -> bool:
    if not user.is_authenticated or not org_id:
        return False
    return user.memberships.filter(
        organization_id=org_id, role__in=roles, is_active=True
    ).exists()
