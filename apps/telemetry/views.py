"""
Telemetry API views.

The ingest endpoint is the most called endpoint in the system and is
optimised for minimal latency. Heavy work is deferred to Celery.

Security:
- DeviceAPIKeyAuthentication is the first authenticator tried.
- IsDeviceAuthenticated permission ensures only provisioned devices can POST.
- DeviceRateThrottle limits ingestion rate to match the device's configured
  reporting interval plus a burst headroom.
"""

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.authentication import DeviceAPIKeyAuthentication
from core.permissions import IsDeviceAuthenticated, IsOrgMember
from core.pagination import LargeCursorPagination
from .models import Location
from .serializers import TelemetryIngestSerializer, LocationSerializer
from .services import TelemetryIngestionService


class TelemetryIngestView(APIView):
    """
    POST /api/v1/telemetry/location
    Receives GPS telemetry from ESP32 devices.
    """

    authentication_classes = [DeviceAPIKeyAuthentication]
    permission_classes = [IsDeviceAuthenticated]

    def post(self, request):
        device = request.auth  # set by DeviceAPIKeyAuthentication

        serializer = TelemetryIngestSerializer(
            data=request.data, context={"device": device}
        )
        serializer.is_valid(raise_exception=True)

        service = TelemetryIngestionService(device=device, data=serializer.validated_data)
        location = service.ingest()

        # Check if there's a pending OTA command for this device
        ota_command = self._get_ota_command(device)

        response_data = {
            "status": "ok",
            "location_id": str(location.id),
        }
        if ota_command:
            response_data["ota"] = ota_command

        return Response(response_data, status=status.HTTP_201_CREATED)

    def _get_ota_command(self, device) -> dict | None:
        from apps.firmware.models import OTAUpdateTask
        from django.conf import settings
        import datetime

        task = OTAUpdateTask.objects.filter(
            device=device, status="queued"
        ).select_related("deployment__firmware_version").first()

        if not task:
            return None

        fw = task.deployment.firmware_version
        # Generate a time-limited signed URL if using S3
        url = fw.file.url
        return {
            "version": fw.version,
            "url": url,
            "checksum_sha256": fw.checksum_sha256,
            "task_id": str(task.id),
        }


class DeviceLocationHistoryView(ListAPIView):
    """
    GET /api/v1/telemetry/devices/{device_id}/history/
    Returns paginated location history for a device.
    """

    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]
    pagination_class = LargeCursorPagination

    def get_queryset(self):
        device_id = self.kwargs["device_id"]
        qs = Location.objects.filter(
            device_id=device_id,
            device__organization__memberships__user=self.request.user,
            device__organization__memberships__is_active=True,
        ).order_by("-timestamp")

        # Optional time range filters
        since = self.request.query_params.get("since")
        until = self.request.query_params.get("until")
        if since:
            qs = qs.filter(timestamp__gte=since)
        if until:
            qs = qs.filter(timestamp__lte=until)

        return qs
