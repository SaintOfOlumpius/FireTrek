from rest_framework.throttling import SimpleRateThrottle


class DeviceRateThrottle(SimpleRateThrottle):
    """
    Rate-limit IoT devices by their device UID.

    At one reading per 30 seconds that's 120 per hour per device.
    We allow some burst headroom for retries after connectivity loss.
    """

    scope = "device"

    def get_cache_key(self, request, view):
        device = request.auth
        from apps.devices.models import Device

        if isinstance(device, Device):
            return self.cache_format % {
                "scope": self.scope,
                "ident": device.uid,
            }
        return None
