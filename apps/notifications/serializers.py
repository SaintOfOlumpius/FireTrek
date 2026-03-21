from rest_framework import serializers

from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "user", "alert", "channel", "title", "body",
            "status", "sent_at", "read_at", "created_at",
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "id", "user", "organization", "alert_type",
            "email_enabled", "sms_enabled", "push_enabled", "in_app_enabled",
        ]
        read_only_fields = ["id", "user"]
