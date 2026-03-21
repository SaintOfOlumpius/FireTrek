from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsOrgAdmin, IsOrgOwner, IsOrgMember
from .models import Organization, Membership, Invitation
from .serializers import OrganizationSerializer, MembershipSerializer, InvitationSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    CRUD for organisations. Owners can delete; admins can update;
    members can read.
    """

    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_queryset(self):
        # Only return organisations the requesting user belongs to.
        return Organization.objects.filter(
            memberships__user=self.request.user,
            memberships__is_active=True,
        ).distinct()

    def perform_create(self, serializer):
        from django.utils.text import slugify
        import shortuuid

        org = serializer.save(
            slug=slugify(serializer.validated_data["name"]) + "-" + shortuuid.uuid()[:6]
        )
        Membership.objects.create(
            user=self.request.user,
            organization=org,
            role="owner",
            is_active=True,
        )


class MembershipViewSet(viewsets.ModelViewSet):
    serializer_class = MembershipSerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_queryset(self):
        org_id = self.kwargs.get("organization_pk")
        return Membership.objects.filter(
            organization_id=org_id,
            organization__memberships__user=self.request.user,
            organization__memberships__is_active=True,
        ).select_related("user")


class InvitationViewSet(viewsets.ModelViewSet):
    serializer_class = InvitationSerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_queryset(self):
        org_id = self.kwargs.get("organization_pk")
        return Invitation.objects.filter(organization_id=org_id)

    def perform_create(self, serializer):
        from apps.organizations.services import InvitationService
        InvitationService.create_invitation(
            serializer=serializer,
            organization_id=self.kwargs["organization_pk"],
            invited_by=self.request.user,
        )
