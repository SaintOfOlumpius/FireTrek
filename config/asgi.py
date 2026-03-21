"""
ASGI config for FireTrek.

We use Channels to handle both HTTP and WebSocket traffic from a single
ASGI entrypoint. Django's regular views run under the http.application
protocol, while WebSocket connections are routed through Channels consumers.

Daphne (or uvicorn) will serve this application in production.
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

django_asgi_app = get_asgi_application()

from realtime.routing import websocket_urlpatterns  # noqa: E402 — must be after setup
from realtime.middleware import JWTWebSocketMiddleware  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTWebSocketMiddleware(
                AuthMiddlewareStack(URLRouter(websocket_urlpatterns))
            )
        ),
    }
)
