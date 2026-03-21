from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsOrgAdmin
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only audit log. Admins can view all logs for their organisation.
    """

    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]
    filterset_fields = ["method", "status_code", "object_type"]
    search_fields = ["path", "user_email", "object_id"]
    ordering_fields = ["timestamp"]

    def get_queryset(self):
        user = self.request.user
        org_ids = list(
            user.memberships.filter(
                is_active=True, role__in=["admin", "owner"]
            ).values_list("organization_id", flat=True)
        )
        return AuditLog.objects.filter(organization_id__in=org_ids).order_by("-timestamp")
