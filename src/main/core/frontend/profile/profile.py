from django.contrib import messages
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect
from django.shortcuts import render, get_object_or_404

from main.core.frontend.profile.forms import EmailUpdateForm, CustomPasswordChangeForm
from main.models.collection import Collection
from main.models.map_tiles import MapTiles
from main.models.theme import Theme


class ProfileView:
    def handle_request(self, request: HttpRequest) -> HttpResponse:
        user = request.user
        collections = user.collections.all()
        all_map_tiles = MapTiles.objects.all()
        all_themes = Theme.objects.all()

        current_collection = user.current_collection
        if current_collection:
            current_collection_id = current_collection.id
        else:
            current_collection_id = collections[0].id if collections else None

        if request.user.map_tiles:
            map_server_id = request.user.map_tiles.id
        else:
            map_server_id = all_map_tiles.first().id

        if request.user.theme:
            theme_id = request.user.theme.id
        else:
            theme_id = all_themes.first().id

        if request.method == "POST":
            if "update_email" in request.POST:
                email_form = EmailUpdateForm(request.POST)
                if email_form.is_valid():
                    user.email = email_form.cleaned_data['email']
                    user.save()
                    messages.success(request, "Email mis à jour avec succès.")
                    return redirect('profile')
                password_form = CustomPasswordChangeForm(user)
            elif "change_password" in request.POST:
                password_form = CustomPasswordChangeForm(user, request.POST)
                if password_form.is_valid():
                    user = password_form.save()
                    update_session_auth_hash(request, user)  # Important pour garder la session
                    messages.success(request, "Mot de passe mis à jour avec succès.")
                    return redirect('profile')
                email_form = EmailUpdateForm(initial={'email': user.email})
        else:
            email_form = EmailUpdateForm(initial={'email': user.email})
            password_form = CustomPasswordChangeForm(user)

        return render(request, 'profile/module.html', {
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'current_collection_id': current_collection_id,
            'collections': [(collection.id, collection.title) for collection in collections],
            'current_map_tiles_id': map_server_id,
            'map_tiles': [(map_tiles.id, map_tiles.description) for map_tiles in all_map_tiles],
            'current_theme_id': theme_id,
            'themes': [(theme.id, theme.description) for theme in all_themes],
            'email_form': email_form,
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
