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


def require_collection_owner(view_func):
    """Réserve la vue au propriétaire (ou à un superuser) de la collection `collection_id`."""

    @wraps(view_func)
    def wrapper(request, collection_id, *args, **kwargs):
        user = request.user
        if not user.is_authenticated:
            return JsonResponse({'success': False, 'error': "Authentification requise."}, status=401)
        from main.models.collection import Collection

        is_owner = Collection.objects.filter(id=collection_id, owner_id=user.id).exists()
        if not (is_owner or user.is_superuser):
            return JsonResponse(
                {'success': False, 'error': "Action réservée au propriétaire de la collection."},
                status=403,
            )
        return view_func(request, collection_id, *args, **kwargs)

    return wrapper
