from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from core.permissions import IsOrgAdmin, IsOrgMember
from .models import Firearm, FirearmCategory
from .serializers import FirearmSerializer, FirearmListSerializer, FirearmCategorySerializer


def _get_org(request):
    """Get the user's active organisation, checking request context first."""
    org = getattr(request, "organization", None)
    if org is not None:
        return org
    from apps.organizations.models import Organization
    return Organization.objects.filter(
        memberships__user=request.user,
        memberships__is_active=True,
    ).first()


class FirearmCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = FirearmCategorySerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_queryset(self):
        return FirearmCategory.objects.filter(
            organization__memberships__user=self.request.user,
            organization__memberships__is_active=True,
        )

    def perform_create(self, serializer):
        serializer.save(organization=_get_org(self.request))


class FirearmViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOrgMember]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "organization", "category"]
    search_fields = ["serial_number", "make", "model", "calibre"]
    ordering_fields = ["created_at", "serial_number", "make", "model"]

    def get_serializer_class(self):
        if self.action == "list":
            return FirearmListSerializer
        return FirearmSerializer

    def get_queryset(self):
        return (
            Firearm.objects.filter(
                organization__memberships__user=self.request.user,
                organization__memberships__is_active=True,
            )
            .select_related("organization", "category", "assigned_to")
            .prefetch_related("devices")
            .distinct()
        )

    def perform_create(self, serializer):
        serializer.save(organization=_get_org(self.request))