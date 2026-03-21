"""
Async Celery task for writing audit log entries.

We deliberately write audit logs asynchronously so that the middleware
never blocks an HTTP response waiting for a DB insert.
"""

from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(queue="low_priority", ignore_result=True)
def create_audit_log_async(
    user_id, method, path, status_code, ip_address, body, elapsed_ms
):
    from apps.audit.models import AuditLog
    from apps.accounts.models import User

    user_email = ""
    if user_id:
        try:
            user_email = User.objects.values_list("email", flat=True).get(pk=user_id)
        except User.DoesNotExist:
            pass

    AuditLog.objects.create(
        user_id=user_id,
        user_email=user_email,
        method=method,
        path=path,
        status_code=status_code,
        ip_address=ip_address,
        body=body,
        elapsed_ms=elapsed_ms,
    )
