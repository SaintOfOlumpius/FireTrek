from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FirmwareVersionViewSet, FirmwareDeploymentViewSet

app_name = "firmware"

router = DefaultRouter()
router.register(r"versions", FirmwareVersionViewSet, basename="version")
router.register(r"deployments", FirmwareDeploymentViewSet, basename="deployment")

urlpatterns = [path("", include(router.urls))]
