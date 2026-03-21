from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GeofenceViewSet, GeofenceAssignmentViewSet, GeofenceEventViewSet

app_name = "geofencing"

router = DefaultRouter()
router.register(r"fences", GeofenceViewSet, basename="geofence")
router.register(r"assignments", GeofenceAssignmentViewSet, basename="assignment")
router.register(r"events", GeofenceEventViewSet, basename="event")

urlpatterns = [path("", include(router.urls))]
