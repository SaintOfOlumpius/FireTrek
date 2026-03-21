"""
WebSocket Consumers for real-time tracking and alerts.

Channel group naming convention:
  org_{org_id}          — All events for an organisation (alerts, incidents)
  device_{device_id}    — Live location stream for a specific device
  user_{user_id}        — Personal notifications for a user

Design:
- Consumers authenticate via JWTWebSocketMiddleware before connection.
- Each consumer joins appropriate groups on connect and leaves on disconnect.
- Messages are pushed from Django sync code via the `broadcast_*` helpers
  in realtime/broadcast.py which use async_to_sync to call the channel layer.
"""

import json
import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class TrackingConsumer(AsyncJsonWebsocketConsumer):
    """
    Streams live location updates to dashboard clients.

    URL: ws://host/ws/tracking/{organization_id}/
    URL: ws://host/ws/tracking/{organization_id}/devices/{device_id}/

    Clients subscribed to the org group receive updates for ALL devices.
    Clients subscribed to the device group receive updates for ONE device.
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.org_id = self.scope["url_route"]["kwargs"].get("org_id")
        self.device_id = self.scope["url_route"]["kwargs"].get("device_id")

        if not await self._is_authorized(user):
            await self.close(code=4003)
            return

        # Join org-level group (receives all device updates for the org)
        self.org_group = f"org_{self.org_id}"
        await self.channel_layer.group_add(self.org_group, self.channel_name)

        # Optionally join a device-specific group
        if self.device_id:
            self.device_group = f"device_{self.device_id}"
            await self.channel_layer.group_add(self.device_group, self.channel_name)

        await self.accept()
        logger.info("WS connect: user=%s org=%s device=%s", user.id, self.org_id, self.device_id)

    async def disconnect(self, close_code):
        if hasattr(self, "org_group"):
            await self.channel_layer.group_discard(self.org_group, self.channel_name)
        if hasattr(self, "device_group"):
            await self.channel_layer.group_discard(self.device_group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Clients can send a "ping" to keep the connection alive
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    # ---------------------------------------------------------------------------
    # Message handlers — invoked by the channel layer when a group message arrives
    # ---------------------------------------------------------------------------

    async def location_update(self, event):
        """Handles 'location.update' messages from the channel layer."""
        await self.send_json({
            "type": "location.update",
            "payload": event["payload"],
        })

    async def alert_created(self, event):
        """Handles 'alert.created' messages pushed by the alert engine."""
        await self.send_json({
            "type": "alert.created",
            "payload": event["payload"],
        })

    async def _is_authorized(self, user) -> bool:
        from channels.db import database_sync_to_async
        from apps.organizations.models import Membership

        @database_sync_to_async
        def check():
            return Membership.objects.filter(
                user=user,
                organization_id=self.org_id,
                is_active=True,
            ).exists()

        return await check()


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Per-user personal notification stream.

    URL: ws://host/ws/notifications/
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user_group = f"user_{user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def notification_created(self, event):
        await self.send_json({
            "type": "notification.created",
            "payload": event["payload"],
        })
