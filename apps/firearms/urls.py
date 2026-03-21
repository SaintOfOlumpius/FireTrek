from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FirearmViewSet, FirearmCategoryViewSet

app_name = "firearms"

router = DefaultRouter()
router.register(r"categories", FirearmCategoryViewSet, basename="category")
router.register(r"", FirearmViewSet, basename="firearm")

urlpatterns = [path("", include(router.urls))]
