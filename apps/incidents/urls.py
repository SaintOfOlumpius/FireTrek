from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IncidentViewSet

app_name = "incidents"

router = DefaultRouter()
router.register(r"", IncidentViewSet, basename="incident")

urlpatterns = [path("", include(router.urls))]
