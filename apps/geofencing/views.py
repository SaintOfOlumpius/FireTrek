from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsOrgAdmin, IsOrgMember
from .models import Geofence, GeofenceAssignment, GeofenceEvent
from .serializers import (
    GeofenceSerializer,
    GeofenceListSerializer,
    GeofenceAssignmentSerializer,
    GeofenceEventSerializer,
)


class GeofenceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_serializer_class(self):
        if self.action == "list":
            return GeofenceListSerializer
        return GeofenceSerializer

    def get_queryset(self):
        qs = Geofence.objects.filter(
            organization__memberships__user=self.request.user,
            organization__memberships__is_active=True,
        ).prefetch_related("assignments").distinct()

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        org_id = self.request.query_params.get("organization")
        if org_id:
            qs = qs.filter(organization_id=org_id)

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        from apps.organizations.models import Organization

        # Use org from request context if middleware sets it, else find first active org
        org = getattr(self.request, "organization", None)
        if org is None:
            org = Organization.objects.filter(
                memberships__user=self.request.user,
                memberships__is_active=True,
            ).first()

        # organization is read_only on the serializer so we pass it via save()
        serializer.save(
            organization=org,
            created_by=self.request.user,
        )

    @action(detail=True, methods=["patch"], url_path="toggle")
    def toggle_active(self, request, pk=None):
        fence = self.get_object()
        fence.is_active = not fence.is_active
        fence.save(update_fields=["is_active"])
        return Response({"id": str(fence.id), "is_active": fence.is_active})

    @action(detail=True, methods=["get"], url_path="events")
    def events(self, request, pk=None):
        fence = self.get_object()
        events = GeofenceEvent.objects.filter(
            assignment__geofence=fence,
        ).select_related(
            "assignment__firearm", "assignment__geofence", "location"
        ).order_by("-timestamp")[:50]
        return Response(GeofenceEventSerializer(events, many=True).data)


class GeofenceAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = GeofenceAssignmentSerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_queryset(self):
        qs = GeofenceAssignment.objects.filter(
            geofence__organization__memberships__user=self.request.user,
            geofence__organization__memberships__is_active=True,
        ).select_related("geofence", "firearm")

        geofence_id = self.request.query_params.get("geofence")
        if geofence_id:
            qs = qs.filter(geofence_id=geofence_id)

        firearm_id = self.request.query_params.get("firearm")
        if firearm_id:
            qs = qs.filter(firearm_id=firearm_id)

        return qs.order_by("-created_at")

    @action(detail=True, methods=["patch"], url_path="toggle")
    def toggle_active(self, request, pk=None):
        assignment = self.get_object()
        assignment.is_active = not assignment.is_active
        assignment.save(update_fields=["is_active"])
        return Response({"id": str(assignment.id), "is_active": assignment.is_active})


class GeofenceEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GeofenceEventSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get_queryset(self):
        qs = GeofenceEvent.objects.filter(
            assignment__geofence__organization__memberships__user=self.request.user,
            assignment__geofence__organization__memberships__is_active=True,
        ).select_related(
            "assignment__geofence",
            "assignment__firearm",
            "location",
        ).order_by("-timestamp")

        geofence_id = self.request.query_params.get("geofence")
        if geofence_id:
            qs = qs.filter(assignment__geofence_id=geofence_id)

        firearm_id = self.request.query_params.get("firearm")
        if firearm_id:
            qs = qs.filter(assignment__firearm_id=firearm_id)

        direction = self.request.query_params.get("direction")
        if direction in ("enter", "exit"):
            qs = qs.filter(direction=direction)

        return qs[:200]