"""
Synchronous helpers for pushing messages to WebSocket channel groups.

These functions are called from synchronous Django/Celery code and use
`asgiref.sync.async_to_sync` to safely invoke the async channel layer.

The payload is kept minimal so it can be serialised cheaply.
The frontend enriches the display from its local state where possible.
"""

import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def broadcast_location_update(device, location):
    """
    Push a location update to:
      - org_{org_id}       — so the org-level dashboard map updates
      - device_{device_id} — so any device-specific widget updates
    """
    channel_layer = get_channel_layer()
    payload = {
        "device_id": str(device.id),
        "device_uid": device.uid,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "altitude": location.altitude,
        "speed": location.speed,
        "battery": location.battery,
        "timestamp": location.timestamp.isoformat(),
    }

    message = {"type": "location_update", "payload": payload}

    try:
        send = async_to_sync(channel_layer.group_send)
        send(f"org_{device.organization_id}", message)
        send(f"device_{device.id}", message)
    except Exception:
        logger.exception("Failed to broadcast location for device %s", device.uid)


def broadcast_alert(alert):
    """Push a new alert to the organisation channel."""
    channel_layer = get_channel_layer()
    payload = {
        "alert_id": str(alert.id),
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "title": alert.title,
        "message": alert.message,
        "device_uid": alert.device.uid if alert.device_id else None,
        "created_at": alert.created_at.isoformat(),
    }

    try:
        async_to_sync(channel_layer.group_send)(
            f"org_{alert.organization_id}",
            {"type": "alert_created", "payload": payload},
        )
    except Exception:
        logger.exception("Failed to broadcast alert %s", alert.id)


def broadcast_notification(notification):
    """Push a personal notification to the user's private channel."""
    channel_layer = get_channel_layer()
    payload = {
        "notification_id": str(notification.id),
        "title": notification.title,
        "body": notification.body,
        "created_at": notification.created_at.isoformat(),
    }

    try:
        async_to_sync(channel_layer.group_send)(
            f"user_{notification.user_id}",
            {"type": "notification_created", "payload": payload},
        )
    except Exception:
        logger.exception("Failed to broadcast notification %s", notification.id)
