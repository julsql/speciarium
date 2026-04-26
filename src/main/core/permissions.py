from functools import wraps

from django.http import JsonResponse


def deny_demo_user(view_func):
    """Bloque l'accès aux utilisateurs témoins (lecture seule)."""

    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if getattr(request.user, 'is_demo', False):
            return JsonResponse(
                {
                    'success': False,
                    'error': "Action non autorisée pour l'utilisateur témoin.",
                },
                status=403,
            )
        return view_func(request, *args, **kwargs)

    return wrapper
