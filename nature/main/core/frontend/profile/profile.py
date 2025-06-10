from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render, get_object_or_404, redirect

from main.models.collection import Collection
from main.models.map_tiles import MapTiles


class ProfileView:
    def handle_request(self, request: HttpRequest) -> HttpResponse:
        user = request.user
        collections = user.collections.all()
        all_map_tiles = MapTiles.objects.all()

        current_collection = user.current_collection
        if current_collection:
            current_collection_id = current_collection.id
        else:
            current_collection_id = collections[0].id

        if request.user.map_tiles:
            map_server_id = request.user.map_tiles.id
        else:
            map_server_id = all_map_tiles.first().id

        return render(request, 'profile/module.html',
                      {'username': user.username,
                       'first_name': user.first_name,
                       'last_name': user.last_name,
                       'email': user.email,
                       'current_collection_id': current_collection_id,
                       'collections': [(collection.id, collection.title) for collection in collections],
                       'current_map_tiles_id': map_server_id,
                       'map_tiles': [(map_tiles.id, map_tiles.description) for map_tiles in list(all_map_tiles)]
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
