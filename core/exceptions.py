"""
Centralised exception handling.

A consistent error envelope means API consumers always know where to find
the human-readable message and any field-level validation errors.

Response shape:
{
    "error": {
        "code": "validation_error",
        "message": "Invalid input.",
        "details": {...}
    }
}
"""

import logging

from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def firetrek_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is not None:
        code = getattr(exc, "default_code", "error")
        message = _extract_message(exc)
        details = response.data if isinstance(response.data, dict) else {"non_field_errors": response.data}

        response.data = {
            "error": {
                "code": code,
                "message": message,
                "details": details,
            }
        }
    else:
        logger.exception("Unhandled exception in view", exc_info=exc)

    return response


def _extract_message(exc) -> str:
    if hasattr(exc, "detail"):
        detail = exc.detail
        if isinstance(detail, str):
            return detail
        if isinstance(detail, list) and detail:
            return str(detail[0])
        if isinstance(detail, dict):
            for v in detail.values():
                if isinstance(v, list) and v:
                    return str(v[0])
    return str(exc)


# ---------------------------------------------------------------------------
# Custom domain exceptions
# ---------------------------------------------------------------------------

class FireTrekAPIException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A FireTrek error occurred."
    default_code = "firetrek_error"


class DeviceNotFound(FireTrekAPIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Device not found or not provisioned."
    default_code = "device_not_found"


class TelemetryRejected(FireTrekAPIException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Telemetry payload could not be processed."
    default_code = "telemetry_rejected"


class GeofenceError(FireTrekAPIException):
    default_detail = "Geofence operation failed."
    default_code = "geofence_error"
