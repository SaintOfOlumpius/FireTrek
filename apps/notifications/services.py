"""
Notification dispatch service.

Responsibilities:
- Look up which users should receive notifications for a given alert.
- Respect each user's NotificationPreference per channel.
- Create a Notification record and hand off to the channel-specific sender.
- Channel senders (email, SMS, push) are implemented as small functions
  so they can be swapped or extended without touching the dispatch logic.
"""

import logging

from django.utils import timezone

from apps.notifications.models import Notification, NotificationPreference

logger = logging.getLogger(__name__)


class NotificationDispatcher:

    def __init__(self, alert):
        self.alert = alert

    def dispatch(self):
        members = self.alert.organization.memberships.filter(
            is_active=True
        ).select_related("user")

        for membership in members:
            prefs = self._get_preferences(membership.user)
            self._send_to_user(membership.user, prefs)

    def _get_preferences(self, user) -> NotificationPreference | None:
        return NotificationPreference.objects.filter(
            user=user,
            organization=self.alert.organization,
            alert_type=self.alert.alert_type,
        ).first()

    def _send_to_user(self, user, prefs):
        defaults = {
            "email_enabled": True,
            "sms_enabled": False,
            "push_enabled": True,
            "in_app_enabled": True,
        }
        channels = {
            "in_app": getattr(prefs, "in_app_enabled", defaults["in_app_enabled"]),
            "email": getattr(prefs, "email_enabled", defaults["email_enabled"]),
            "sms": getattr(prefs, "sms_enabled", defaults["sms_enabled"]),
            "push": getattr(prefs, "push_enabled", defaults["push_enabled"]),
        }

        for channel, enabled in channels.items():
            if enabled:
                self._create_and_send(user, channel)

    def _create_and_send(self, user, channel: str):
        notification = Notification.objects.create(
            user=user,
            alert=self.alert,
            channel=channel,
            title=self.alert.title,
            body=self.alert.message,
        )
        sender = CHANNEL_SENDERS.get(channel)
        if sender:
            try:
                sender(notification)
                notification.status = "sent"
                notification.sent_at = timezone.now()
            except Exception as exc:
                notification.status = "failed"
                notification.error_message = str(exc)
                logger.exception("Notification send failed for user %s via %s", user.email, channel)
            notification.save(update_fields=["status", "sent_at", "error_message"])


# ---------------------------------------------------------------------------
# Channel senders
# ---------------------------------------------------------------------------

def send_email_notification(notification: Notification):
    from django.core.mail import send_mail
    from django.conf import settings

    send_mail(
        subject=f"[FireTrek] {notification.title}",
        message=notification.body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[notification.user.email],
        fail_silently=False,
    )


def send_sms_notification(notification: Notification):
    """
    Placeholder for SMS via Twilio or similar.
    In production, import twilio.rest.Client and send an SMS.
    """
    phone = notification.user.phone
    if not phone:
        raise ValueError("User has no phone number configured.")
    logger.info("SMS (stub): %s → %s", notification.title, phone)


def send_push_notification(notification: Notification):
    """
    Placeholder for FCM/APNs push notification.
    In production, use firebase_admin.messaging.
    """
    logger.info("PUSH (stub): %s → user %s", notification.title, notification.user_id)


def send_inapp_notification(notification: Notification):
    """
    In-app notifications are stored in the DB (already done above).
    Optionally broadcast via WebSocket so the UI updates instantly.
    """
    from realtime.broadcast import broadcast_notification
    try:
        broadcast_notification(notification)
    except Exception:
        logger.exception("In-app broadcast failed for notification %s", notification.id)


CHANNEL_SENDERS = {
    "email": send_email_notification,
    "sms": send_sms_notification,
    "push": send_push_notification,
    "in_app": send_inapp_notification,
}
