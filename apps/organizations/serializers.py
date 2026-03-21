from rest_framework import serializers

from .models import Organization, Membership, Invitation


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            "id", "name", "slug", "logo", "address", "country",
            "contact_email", "contact_phone", "is_active",
            "subscription_plan", "max_devices", "max_users", "created_at",
        ]
        read_only_fields = ["id", "slug", "created_at"]


class MembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = Membership
        fields = [
            "id", "user", "user_email", "user_full_name",
            "organization", "role", "is_active", "joined_at",
        ]
        read_only_fields = ["id", "joined_at"]


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ["id", "organization", "email", "role", "expires_at", "accepted", "created_at"]
        read_only_fields = ["id", "token", "accepted", "created_at"]
