from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsOrgMember, IsOrgAdmin
from .models import Incident, IncidentNote, IncidentAlert
from .serializers import IncidentSerializer, IncidentNoteSerializer


class IncidentViewSet(viewsets.ModelViewSet):
    serializer_class = IncidentSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]
    filterset_fields = ["status", "priority", "assigned_to"]

    def get_queryset(self):
        return Incident.objects.filter(
            organization__memberships__user=self.request.user,
            organization__memberships__is_active=True,
        ).prefetch_related("notes", "incident_alerts")

    @action(detail=True, methods=["post"])
    def add_note(self, request, pk=None):
        incident = self.get_object()
        serializer = IncidentNoteSerializer(
            data={**request.data, "incident": incident.pk},
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def link_alert(self, request, pk=None):
        incident = self.get_object()
        alert_id = request.data.get("alert_id")
        if not alert_id:
            return Response({"detail": "alert_id required."}, status=status.HTTP_400_BAD_REQUEST)
        from apps.alerts.models import Alert
        alert = Alert.objects.get(pk=alert_id, organization=incident.organization)
        IncidentAlert.objects.get_or_create(incident=incident, alert=alert)
        return Response({"detail": "Alert linked."})

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        incident = self.get_object()
        incident.status = "resolved"
        incident.resolved_at = timezone.now()
        incident.resolved_by = request.user
        incident.save(update_fields=["status", "resolved_at", "resolved_by"])
        return Response(IncidentSerializer(incident, context={"request": request}).data)
