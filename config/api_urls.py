"""
API v1 URL routing — all app routers are registered here.
"""

from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    # Authentication
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),

    # Apps
    path("accounts/", include("apps.accounts.urls", namespace="accounts")),
    path("organizations/", include("apps.organizations.urls", namespace="organizations")),
    path("firearms/", include("apps.firearms.urls", namespace="firearms")),
    path("devices/", include("apps.devices.urls", namespace="devices")),
    path("telemetry/", include("apps.telemetry.urls", namespace="telemetry")),
    path("geofencing/", include("apps.geofencing.urls", namespace="geofencing")),
    path("alerts/", include("apps.alerts.urls", namespace="alerts")),
    path("incidents/", include("apps.incidents.urls", namespace="incidents")),
    path("notifications/", include("apps.notifications.urls", namespace="notifications")),
    path("firmware/", include("apps.firmware.urls", namespace="firmware")),
    path("audit/", include("apps.audit.urls", namespace="audit")),
]
