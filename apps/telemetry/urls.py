from django.urls import path
from .views import TelemetryIngestView, DeviceLocationHistoryView

app_name = "telemetry"

urlpatterns = [
    path("location/", TelemetryIngestView.as_view(), name="ingest"),
    path("devices/<uuid:device_id>/history/", DeviceLocationHistoryView.as_view(), name="history"),
]
