"""
Audit log models.

AuditLog provides a tamper-evident record of all mutations in the system.
Records are append-only — there is no update or delete operation on this table.

Design: We store the body as JSON so we can search/filter log entries by
request content later. The `object_type` and `object_id` fields allow
"give me all audit events for firearm X" queries.
"""

from django.db import models

from core.models import UUIDModel


class AuditLog(UUIDModel):
    """Immutable record of a system event."""

    user_id = models.UUIDField(null=True, blank=True)
    user_email = models.EmailField(blank=True)
    organization_id = models.UUIDField(null=True, blank=True)

    method = models.CharField(max_length=10)
    path = models.CharField(max_length=500)
    status_code = models.SmallIntegerField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    body = models.JSONField(default=dict, blank=True)
    elapsed_ms = models.IntegerField(default=0)

    object_type = models.CharField(max_length=100, blank=True)  # e.g. "Firearm"
    object_id = models.CharField(max_length=50, blank=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        indexes = [
            models.Index(fields=["-timestamp"]),
            models.Index(fields=["user_id", "-timestamp"]),
            models.Index(fields=["organization_id", "-timestamp"]),
            models.Index(fields=["object_type", "object_id"]),
        ]
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.method} {self.path} [{self.status_code}]"
