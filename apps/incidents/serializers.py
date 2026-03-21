from rest_framework import serializers

from .models import Incident, IncidentNote, IncidentAlert


class IncidentNoteSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True)

    class Meta:
        model = IncidentNote
        fields = ["id", "incident", "author", "author_email", "content", "attachment", "created_at"]
        read_only_fields = ["id", "author", "created_at"]

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)


class IncidentSerializer(serializers.ModelSerializer):
    notes = IncidentNoteSerializer(many=True, read_only=True)
    linked_alert_ids = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            "id", "organization", "title", "description", "status",
            "priority", "firearm", "assigned_to", "created_by",
            "resolved_at", "resolved_by", "metadata",
            "notes", "linked_alert_ids", "created_at",
        ]
        read_only_fields = ["id", "created_by", "resolved_at", "resolved_by", "created_at"]

    def get_linked_alert_ids(self, obj):
        return list(obj.incident_alerts.values_list("alert_id", flat=True))

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
