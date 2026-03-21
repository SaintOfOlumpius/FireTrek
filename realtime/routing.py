from django.urls import re_path
from .consumers import TrackingConsumer, NotificationConsumer

websocket_urlpatterns = [
    # Org-level tracking (all devices)
    re_path(r"ws/tracking/(?P<org_id>[0-9a-f-]+)/$", TrackingConsumer.as_asgi()),

    # Single-device tracking
    re_path(
        r"ws/tracking/(?P<org_id>[0-9a-f-]+)/devices/(?P<device_id>[0-9a-f-]+)/$",
        TrackingConsumer.as_asgi(),
    ),

    # Personal notifications
    re_path(r"ws/notifications/$", NotificationConsumer.as_asgi()),
]
