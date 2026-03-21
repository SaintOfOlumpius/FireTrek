from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, NotificationPreferenceViewSet

app_name = "notifications"

router = DefaultRouter()
router.register(r"preferences", NotificationPreferenceViewSet, basename="preference")
router.register(r"", NotificationViewSet, basename="notification")

urlpatterns = [path("", include(router.urls))]
