"""
Custom Django middleware.

AuditLogMiddleware — records every mutating API call (POST/PUT/PATCH/DELETE)
to the AuditLog table. This is required for regulated-equipment compliance.

TenantMiddleware — attaches the current organisation to the request object
based on the X-Organization-ID header so views can filter querysets without
repeating the lookup.
"""

import json
import logging
import time

logger = logging.getLogger(__name__)


class AuditLogMiddleware:
    """
    Records mutating HTTP requests to the audit log.

    We capture: user, method, path, status code, request body (sanitised),
    response time, and IP address.
    """

    MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
    SENSITIVE_FIELDS = {"password", "api_key", "token", "secret"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        elapsed_ms = int((time.monotonic() - start) * 1000)

        if request.method in self.MUTATING_METHODS and request.path.startswith("/api/"):
            self._log_request(request, response, elapsed_ms)

        return response

    def _log_request(self, request, response, elapsed_ms):
        from apps.audit.tasks import create_audit_log_async

        user_id = request.user.id if request.user.is_authenticated else None
        body = self._safe_body(request)

        try:
            create_audit_log_async.delay( # type: ignore
                user_id=user_id,
                method=request.method,
                path=request.path,
                status_code=response.status_code,
                ip_address=self._get_ip(request),
                body=body,
                elapsed_ms=elapsed_ms,
            )
        except Exception:
            logger.warning("Audit log task failed — Redis may be unavailable")

    def _safe_body(self, request) -> dict:
        try:
            data = json.loads(request.body) if request.body else {}
            return {k: "***" if k in self.SENSITIVE_FIELDS else v for k, v in data.items()}
        except Exception:
            return {}

    @staticmethod
    def _get_ip(request) -> str:
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "")


class TenantMiddleware:
    """
    Reads X-Organization-ID header and attaches the Organisation object to
    `request.organization`. Views can use this without repeating the DB lookup.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.organization = None
        org_id = request.headers.get("X-Organization-ID")
        if org_id and request.user.is_authenticated if hasattr(request, "user") else False:
            from apps.organizations.models import Organization
            from django.core.cache import cache

            cache_key = f"org:{org_id}"
            org = cache.get(cache_key)
            if org is None:
                try:
                    org = Organization.objects.get(pk=org_id, is_active=True)
                    cache.set(cache_key, org, 300)
                except Organization.DoesNotExist:
                    org = None
            request.organization = org

        return self.get_response(request)
