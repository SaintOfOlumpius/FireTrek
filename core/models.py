"""
Abstract base models used across all apps.

Using UUID primary keys throughout the system:
- Prevents enumeration attacks (IDs are not sequential integers)
- Safe to expose in URLs and API responses
- Can be generated client-side or device-side before insertion

TimestampedModel gives every model created_at / updated_at without repetition.
"""

import uuid

from django.db import models


class UUIDModel(models.Model):
    """Abstract model with UUID primary key."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimestampedModel(UUIDModel):
    """Abstract model with UUID PK and automatic timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]
