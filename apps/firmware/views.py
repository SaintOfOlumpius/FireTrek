from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsOrgAdmin
from .models import FirmwareVersion, FirmwareDeployment, OTAUpdateTask
from .serializers import FirmwareVersionSerializer, FirmwareDeploymentSerializer, OTAUpdateTaskSerializer


class FirmwareVersionViewSet(viewsets.ModelViewSet):
    serializer_class = FirmwareVersionSerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_queryset(self):
        return FirmwareVersion.objects.filter(
            organization__memberships__user=self.request.user,
            organization__memberships__is_active=True,
        )


class FirmwareDeploymentViewSet(viewsets.ModelViewSet):
    serializer_class = FirmwareDeploymentSerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_queryset(self):
        return FirmwareDeployment.objects.filter(
            firmware_version__organization__memberships__user=self.request.user,
            firmware_version__organization__memberships__is_active=True,
        ).prefetch_related("otaupdatetask_set__device")

    def perform_create(self, serializer):
        deployment = serializer.save(created_by=self.request.user)
        # Queue OTA tasks for target devices
        from workers.tasks.firmware_tasks import queue_ota_tasks
        queue_ota_tasks.delay(str(deployment.id))

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        deployment = self.get_object()
        if deployment.status in ("completed", "cancelled"):
            return Response(
                {"detail": "Cannot cancel a completed or already cancelled deployment."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deployment.status = "cancelled"
        deployment.save(update_fields=["status"])
        OTAUpdateTask.objects.filter(deployment=deployment, status="queued").update(status="skipped")
        return Response({"detail": "Deployment cancelled."})
