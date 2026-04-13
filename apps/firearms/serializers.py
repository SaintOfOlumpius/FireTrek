from rest_framework import serializers

from .models import Firearm, FirearmCategory


class FirearmCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FirearmCategory
        fields = ["id", "organization", "name", "description", "created_at"]
        read_only_fields = ["id", "organization", "created_at"]


class FirearmSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    assigned_to_email = serializers.EmailField(source="assigned_to.email", read_only=True)
    active_device_uid = serializers.SerializerMethodField()

    class Meta:
        model = Firearm
        fields = [
            "id", "organization", "category", "category_name",
            "serial_number", "make", "model", "calibre", "status",
            "assigned_to", "assigned_to_email", "active_device_uid",
            "notes", "image", "license_number", "license_expiry", "created_at",
        ]
        read_only_fields = ["id", "organization", "created_at"]

    def get_active_device_uid(self, obj):
        device = obj.devices.filter(is_active=True).first()
        return device.uid if device else None


class FirearmListSerializer(serializers.ModelSerializer):
    """List serializer — includes all fields needed to render the table."""
    category_name = serializers.CharField(source="category.name", read_only=True)
    assigned_to_email = serializers.EmailField(source="assigned_to.email", read_only=True)
    active_device_uid = serializers.SerializerMethodField()

    class Meta:
        model = Firearm
        fields = [
            "id", "serial_number", "make", "model", "calibre",
            "status", "category_name", "assigned_to_email",
            "active_device_uid", "license_expiry",
        ]

    def get_active_device_uid(self, obj):
        device = obj.devices.filter(is_active=True).first()
        return device.uid if device else None