from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from core.permissions import IsOrgAdmin, IsOrgMember
from .models import Firearm, FirearmCategory
from .serializers import FirearmSerializer, FirearmListSerializer, FirearmCategorySerializer


class FirearmCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = FirearmCategorySerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_queryset(self):
        return FirearmCategory.objects.filter(
            organization__memberships__user=self.request.user,
            organization__memberships__is_active=True,
        )


class FirearmViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOrgMember]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "organization", "category"]
    search_fields = ["serial_number", "make", "model"]
    ordering_fields = ["created_at", "serial_number"]

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
