from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers

from .views import OrganizationViewSet, MembershipViewSet, InvitationViewSet

app_name = "organizations"

router = DefaultRouter()
router.register(r"", OrganizationViewSet, basename="organization")

org_router = nested_routers.NestedDefaultRouter(router, r"", lookup="organization")
org_router.register(r"members", MembershipViewSet, basename="org-members")
org_router.register(r"invitations", InvitationViewSet, basename="org-invitations")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(org_router.urls)),
]
