import json

from django.contrib import messages
from django.contrib.auth import update_session_auth_hash, get_user_model
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Case, When, IntegerField, Exists, OuterRef
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_POST, require_http_methods

from main.core.frontend.profile.forms import EmailUpdateForm, CustomPasswordChangeForm, UsernameUpdateForm
from main.models.collection import Collection
from main.models.collection_accounts import CollectionAccounts
from main.models.map_tiles import MapTiles
from main.models.photo import Photos
from main.models.theme import Theme


class ProfileView:
    def handle_request(self, request: HttpRequest) -> HttpResponse:
        user = request.user
        collections = user.collections.annotate(
            special_order=Case(
                When(owner=user, then=0),  # les collections "spéciales" viennent en premier
                default=1,
                output_field=IntegerField(),
            ),
            has_photos=Exists(
                Photos.objects.filter(collection=OuterRef('pk'))
            )
        ).order_by('special_order', 'created_at')
        all_map_tiles = MapTiles.objects.all()
        all_themes = Theme.objects.all()

        current_collection = user.current_collection
        if current_collection:
            current_collection_id = current_collection.id
            current_collection_title = current_collection.title
        else:
            current_collection_id = collections[0].id if collections else None
            current_collection_title = collections[0].title if collections else None

        if request.user.map_tiles:
            map_server_id = request.user.map_tiles.id
        else:
            map_server_id = all_map_tiles.first().id

        if request.user.theme:
            theme_id = request.user.theme.id
        else:
            theme_id = all_themes.first().id

        username_form = UsernameUpdateForm(initial={'username': user.username})
        email_form = EmailUpdateForm(initial={'email': user.email})
        password_form = CustomPasswordChangeForm(user)

        if request.method == "POST":
            if "update_username" in request.POST:
                username_form = UsernameUpdateForm(request.POST, user=request.user)
                if username_form.is_valid():
                    user.username = username_form.cleaned_data["username"]
                    user.save()
                    messages.success(request, "Nom d'utilisateur mis à jour.")
                    return redirect("profile")
            if "update_email" in request.POST:
                email_form = EmailUpdateForm(request.POST, user=request.user)
                if email_form.is_valid():
                    user.email = email_form.cleaned_data['email']
                    user.save()
                    messages.success(request, "Email mis à jour avec succès.")
                    return redirect('profile')
            elif "change_password" in request.POST:
                password_form = CustomPasswordChangeForm(user, request.POST)
                if password_form.is_valid():
                    user = password_form.save()
                    update_session_auth_hash(request, user)  # Important pour garder la session
                    messages.success(request, "Mot de passe mis à jour avec succès.")
                    return redirect('profile')

        all_collections = [
            (
                collection.id,
                collection.title,
                collection.owner_id,
                collection.owner.username,
                collection.accounts
                .annotate(
                    is_me=Case(
                        When(collectionaccounts__user=request.user, then=0),
                        default=1,
                        output_field=IntegerField(),
                    )
                )
                .order_by(
                    'is_me',
                    'collectionaccounts__created_at'
                )
                .values_list('username', flat=True),
                collection.accounts
                .exclude(pk=request.user.pk)
                .annotate(
                    is_me=Case(
                        When(collectionaccounts__user=request.user, then=0),
                        default=1,
                        output_field=IntegerField(),
                    )
                )
                .order_by(
                    'is_me',
                    'collectionaccounts__created_at'
                )
                .values_list('username', flat=True),
                collection.has_photos,
            )
            for collection in collections
        ]

        return render(request, 'profile/module.html', {
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'current_collection_id': current_collection_id,
            'current_collection_title': current_collection_title,
            'collections': all_collections,
            'current_map_tiles_id': map_server_id,
            'map_tiles': [(map_tiles.id, map_tiles.description) for map_tiles in all_map_tiles],
            'current_theme_id': theme_id,
            'themes': [(theme.id, theme.description) for theme in all_themes],
            'email_form': email_form,
            'username_form': username_form,
            'password_form': password_form,
        })

    def change_collection(self, request: HttpRequest, collection_id: int) -> HttpResponse:
        collection = get_object_or_404(Collection, id=collection_id, accounts=request.user)
        request.user.current_collection = collection
        request.user.save()
        return redirect('profile')

    def change_map_tiles(self, request: HttpRequest, map_tiles_id: int) -> HttpResponse:
        map_tiles = get_object_or_404(MapTiles, id=map_tiles_id)
        request.user.map_tiles = map_tiles
        request.user.save()
        return redirect('profile')

    def change_themes(self, request: HttpRequest, theme_id: int) -> HttpResponse:
        theme = get_object_or_404(Theme, id=theme_id)
        request.user.theme = theme
        request.user.save()
        return redirect('profile')

    def update_collection_name(self, request: HttpRequest) -> HttpResponse:
        data = json.loads(request.body)
        collection_id = data.get("collection_id")
        new_title = data.get("new_title")

        try:
            collection = Collection.objects.get(id=collection_id, owner=request.user)
            collection.title = new_title
            collection.save()
            return JsonResponse({"success": True})
        except Collection.DoesNotExist:
            return JsonResponse({"success": False, "error": "Collection non trouvée"})

    def add_user_to_collection(self, request):
        data = json.loads(request.body)
        username = data.get("username")
        collection_id = data.get("collection_id")

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({"success": False, "error": "Utilisateur inexistant"})

        try:
            print(collection_id)
            collection = Collection.objects.get(id=collection_id)
        except Collection.DoesNotExist:
            return JsonResponse({"success": False, "error": "Collection inconnue"})

        # éviter doublon
        if CollectionAccounts.objects.filter(user=user, collection=collection).exists():
            return JsonResponse({"success": False, "error": "Utilisateur déjà ajouté"})

        CollectionAccounts.objects.create(
            user=user,
            collection=collection
        )

        return JsonResponse({"success": True})

    def remove_user_from_collection(self, request):
        data = json.loads(request.body)
        username = data.get("username")
        collection_id = data.get("collection_id")

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({"success": False, "error": "Utilisateur inexistant"})

        CollectionAccounts.objects.filter(
            collection_id=collection_id,
            user=user
        ).delete()

        return JsonResponse({"success": True})

    def create_collection(self, request):
        try:
            data = json.loads(request.body)
            title = data.get('title', '').strip()

            if not title:
                return JsonResponse({'success': False, 'error': 'Le titre est requis.'})

            if Collection.objects.filter(owner=request.user, title=title).exists():
                return JsonResponse({'success': False, 'error': 'Vous avez déjà une collection avec ce titre.'})

            collection = Collection.objects.create(title=title, owner=request.user)
            collection.accounts.add(request.user)

            return JsonResponse({'success': True, 'collection_id': collection.id, 'title': collection.title})

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

    def delete_collection(self, request, collection_id):
        user = request.user

        # Récupérer la collection et s'assurer que l'utilisateur en est le propriétaire
        collection = get_object_or_404(Collection, pk=collection_id, owner=user)

        # Vérifier si la collection contient des photos
        if collection.rows.exists():
            print("Impossible de supprimer : la collection contient des photos.")
            return JsonResponse(
                {"success": False, "error": "Impossible de supprimer : la collection contient des photos."},
                status=400
            )

        # Vérifier s'il existe d'autres collections dont l'utilisateur est propriétaire
        other_collections = Collection.objects.filter(owner=user).exclude(pk=collection.pk)
        if not other_collections.exists():
            print("Impossible de supprimer : c'est votre seule collection.")
            return JsonResponse(
                {"success": False, "error": "Impossible de supprimer : c'est votre seule collection."},
                status=400
            )

        # Tout faire dans une transaction pour sécurité
        with transaction.atomic():

            # Si c'est la collection actuelle de l'utilisateur, changer la current_collection
            if hasattr(user, "current_collection") and user.current_collection_id == collection.id:
                user.current_collection = other_collections.first()
                user.save(update_fields=["current_collection"])

            # Supprimer tous les comptes qui peuvent voir cette collection
            CollectionAccounts.objects.filter(collection=collection).delete()

            # Supprimer la collection
            collection.delete()

        return JsonResponse({"success": True})


@login_required
def profile_view(request: HttpRequest) -> HttpResponse:
    view = ProfileView()
    return view.handle_request(request)


@login_required
def change_collection_view(request, collection_id):
    view = ProfileView()
    return view.change_collection(request, collection_id)


@login_required
def change_map_tiles_view(request, map_tiles_id):
    view = ProfileView()
    return view.change_map_tiles(request, map_tiles_id)


@login_required
def change_theme_view(request, theme_id):
    view = ProfileView()
    return view.change_themes(request, theme_id)


@login_required
@require_POST
def update_collection_name_view(request):
    view = ProfileView()
    return view.update_collection_name(request)


User = get_user_model()


@require_POST
@login_required
def add_user_to_collection_view(request):
    view = ProfileView()
    return view.add_user_to_collection(request)


@require_POST
@login_required
def remove_user_from_collection_view(request):
    view = ProfileView()
    return view.remove_user_from_collection(request)


@login_required
@require_POST
def create_collection_view(request):
    view = ProfileView()
    return view.create_collection(request)


@login_required
@require_http_methods(["DELETE"])
def delete_collection_view(request, collection_id):
    view = ProfileView()
    return view.delete_collection(request, collection_id)
