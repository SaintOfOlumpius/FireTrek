from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsOrgMember
from .models import Alert
from .serializers import AlertSerializer, AlertResolveSerializer


class AlertViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]
    filterset_fields = ["alert_type", "severity", "device"]

    def get_queryset(self):
        qs = Alert.objects.filter(
            organization__memberships__user=self.request.user,
            organization__memberships__is_active=True,
        ).select_related("device", "firearm")

        # Filter to open alerts by default unless ?resolved=true
        resolved = self.request.query_params.get("resolved", "false").lower()
        if resolved != "true":
            qs = qs.filter(resolved_at__isnull=True)

        return qs.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        if alert.acknowledged_at:
            return Response({"detail": "Already acknowledged."}, status=status.HTTP_400_BAD_REQUEST)
        alert.acknowledged_at = timezone.now()
        alert.acknowledged_by = request.user
        alert.save(update_fields=["acknowledged_at", "acknowledged_by"])
        return Response(AlertSerializer(alert).data)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        serializer = AlertResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not alert.is_open:
            return Response({"detail": "Alert already resolved."}, status=status.HTTP_400_BAD_REQUEST)
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.user
        alert.save(update_fields=["resolved_at", "resolved_by"])
        return Response(AlertSerializer(alert).data)
