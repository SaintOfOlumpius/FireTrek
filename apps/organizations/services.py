import secrets
from datetime import timedelta

from django.utils import timezone


class InvitationService:
    @staticmethod
    def create_invitation(serializer, organization_id, invited_by):
        from apps.organizations.models import Organization, Invitation
        from workers.tasks.notification_tasks import send_invitation_email

        org = Organization.objects.get(pk=organization_id)
        token = secrets.token_urlsafe(32)
        invitation = serializer.save(
            organization=org,
            invited_by=invited_by,
            token=token,
            expires_at=timezone.now() + timedelta(days=7),
        )
        send_invitation_email.delay(str(invitation.id))
        return invitation
