"""
Custom authentication backends for FireTrek.

Two authentication schemes are supported:

1. JWTAuthentication — for human users (dashboard, mobile app).
   Extends simplejwt so we can attach the full user object including
   their organisation and role in a single cache lookup.

2. DeviceAPIKeyAuthentication — for ESP32 hardware devices.
   Devices cannot store refresh tokens securely. They carry a static
   API key (stored hashed in the DB) in the X-Device-Key header.
   This keeps the device credential simple while remaining secure enough
   because each key is scoped to one device and can be revoked instantly.
"""

import hashlib
import logging

from django.core.cache import cache
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication as BaseJWT
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)


class JWTAuthentication(BaseJWT):
    """
    JWT authentication that caches the user object to reduce DB round-trips
    on high-frequency requests.
    """

    CACHE_TTL = 300  # 5 minutes

    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        cache_key = f"jwt_user:{user_id}"
        user = cache.get(cache_key)
        if user is None:
            user = super().get_user(validated_token)
            cache.set(cache_key, user, self.CACHE_TTL)
        return user


class DeviceAPIKeyAuthentication(BaseAuthentication):
    """
    Authenticates ESP32 devices using an API key supplied in the
    X-Device-Key request header.

    The key is stored as SHA-256(key) in the Device model so that a
    database breach does not expose live credentials.
    """

    HEADER = "HTTP_X_DEVICE_KEY"

    def authenticate(self, request):
        raw_key = request.META.get(self.HEADER)
        if not raw_key:
            return None  # Let next authenticator try

        hashed = self._hash_key(raw_key)
        device = self._get_device(hashed)
        if device is None:
            raise AuthenticationFailed("Invalid or revoked device API key.")
        if not device.is_active:
            raise AuthenticationFailed("Device is deactivated.")

        # Return a (user, auth) tuple where auth carries the device itself.
        # Views can access the device via request.auth.
        return (device.created_by, device)

    def authenticate_header(self, request):
        return "DeviceKey"

    @staticmethod
    def _hash_key(raw_key: str) -> str:
        return hashlib.sha256(raw_key.encode()).hexdigest()

    @staticmethod
    def _get_device(hashed_key: str):
        from apps.devices.models import Device

        cache_key = f"device_key:{hashed_key}"
        device = cache.get(cache_key)
        if device is None:
            try:
                device = Device.objects.select_related("organization", "firearm", "created_by").get(
                    api_key_hash=hashed_key
                )
                cache.set(cache_key, device, 60)  # short TTL — key revocation must propagate fast
            except Device.DoesNotExist:
                return None
        return device
