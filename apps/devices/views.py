from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsOrgAdmin, IsOrgMember
from .models import Device, DeviceHealth
from .serializers import (
    DeviceSerializer,
    DeviceProvisionSerializer,
    DeviceProvisionResponseSerializer,
    DeviceHealthSerializer,
)


class DeviceViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get_queryset(self):
        return Device.objects.filter(
            organization__memberships__user=self.request.user,
            organization__memberships__is_active=True,
        ).select_related("organization", "firearm", "firmware_version")

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated, IsOrgAdmin])
    def provision(self, request):
        """
        Provision a new ESP32 device. Returns the one-time API key.
        The key is never stored in plaintext; it must be saved by the caller.
        """
        serializer = DeviceProvisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.organizations.models import Organization
        from apps.firearms.models import Firearm

        org = request.organization or Organization.objects.filter(
            memberships__user=request.user, memberships__is_active=True
        ).first()

        firearm = None
        if serializer.validated_data.get("firearm"):
            firearm = Firearm.objects.get(pk=serializer.validated_data["firearm"], organization=org)

        device, raw_key = Device.provision(
            organization=org,
            uid=serializer.validated_data["uid"],
            name=serializer.validated_data["name"],
            firearm=firearm,
            created_by=request.user,
        )

        response_data = DeviceProvisionResponseSerializer(device).data
        response_data["api_key"] = raw_key
        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def health(self, request, pk=None):
        device = self.get_object()
        records = DeviceHealth.objects.filter(device=device).order_by("-timestamp")[:100]
        serializer = DeviceHealthSerializer(records, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsOrgAdmin])
    def deactivate(self, request, pk=None):
        device = self.get_object()
        device.is_active = False
        device.status = "decommissioned"
        device.save(update_fields=["is_active", "status"])
        return Response({"detail": "Device deactivated."})
