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

        # Build response manually — don't pass device to serializer since api_key
        # is not a model field, it only exists as raw_key at this moment
        return Response({
            "id": str(device.id),
            "uid": device.uid,
            "name": device.name,
            "organization": str(device.organization_id),
            "api_key": raw_key,
            "created_at": device.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"])
    def health(self, request, pk=None):
        device = self.get_object()

        if request.method == "POST":
            serializer = DeviceHealthSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(device=device)
            return Response({"status": "ok"}, status=status.HTTP_201_CREATED)

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
