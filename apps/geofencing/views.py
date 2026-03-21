from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsOrgAdmin, IsOrgMember
from .models import Geofence, GeofenceAssignment, GeofenceEvent
from .serializers import GeofenceSerializer, GeofenceAssignmentSerializer, GeofenceEventSerializer


class GeofenceViewSet(viewsets.ModelViewSet):
    serializer_class = GeofenceSerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_queryset(self):
        return Geofence.objects.filter(
            organization__memberships__user=self.request.user,
            organization__memberships__is_active=True,
        ).distinct()


class GeofenceAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = GeofenceAssignmentSerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_queryset(self):
        return GeofenceAssignment.objects.filter(
            geofence__organization__memberships__user=self.request.user,
            geofence__organization__memberships__is_active=True,
        ).select_related("geofence", "firearm")


class GeofenceEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GeofenceEventSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get_queryset(self):
        return GeofenceEvent.objects.filter(
            assignment__geofence__organization__memberships__user=self.request.user,
            assignment__geofence__organization__memberships__is_active=True,
        ).select_related("assignment__geofence", "assignment__firearm").order_by("-timestamp")
