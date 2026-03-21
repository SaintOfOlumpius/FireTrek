"""
JWT authentication middleware for WebSocket connections.

Django Channels' AuthMiddlewareStack supports session-based auth out of the
box. For JWT (used by our SPA / mobile clients), we inspect the token from
the query string: ws://host/ws/tracking/org-id/?token=<jwt>

We deliberately do NOT use the Authorization header because the WebSocket
handshake is an HTTP GET and some clients/proxies strip the header.
"""

from urllib.parse import parse_qs

from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


class JWTWebSocketMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        scope["user"] = await self._get_user(scope)
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def _get_user(self, scope):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token_list = params.get("token", [])
        if not token_list:
            return AnonymousUser()

        token = token_list[0]
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from apps.accounts.models import User

            access_token = AccessToken(token)
            user_id = access_token.get("user_id")
            return User.objects.get(pk=user_id, is_active=True)
        except Exception:
            return AnonymousUser()
