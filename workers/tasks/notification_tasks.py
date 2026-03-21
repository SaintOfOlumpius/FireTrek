"""
Notification dispatch tasks.
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    queue="notifications",
    max_retries=3,
    default_retry_delay=30,
)
def dispatch_alert_notifications(self, alert_id: str):
    try:
        from apps.alerts.models import Alert
        from apps.notifications.services import NotificationDispatcher

        alert = Alert.objects.select_related("organization", "device", "firearm").get(pk=alert_id)
        NotificationDispatcher(alert).dispatch()

    except Exception as exc:
        logger.exception("Notification dispatch failed for alert %s", alert_id)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    queue="notifications",
    max_retries=3,
    default_retry_delay=60,
)
def send_invitation_email(self, invitation_id: str):
    try:
        from apps.organizations.models import Invitation
        from django.core.mail import send_mail
        from django.conf import settings

        invitation = Invitation.objects.select_related("organization", "invited_by").get(pk=invitation_id)
        accept_url = f"https://app.firetrek.io/invitations/accept/{invitation.token}/"

        send_mail(
            subject=f"You're invited to join {invitation.organization.name} on FireTrek",
            message=(
                f"Hi,\n\n"
                f"{invitation.invited_by.full_name} has invited you to join "
                f"{invitation.organization.name} on FireTrek as a {invitation.role}.\n\n"
                f"Accept your invitation: {accept_url}\n\n"
                f"This invitation expires on {invitation.expires_at.strftime('%Y-%m-%d')}.\n\n"
                f"FireTrek Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.email],
        )

    except Exception as exc:
        logger.exception("Invitation email failed for invitation %s", invitation_id)
        raise self.retry(exc=exc)
