from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render, get_object_or_404, redirect

from main.models.collection import Collection


class ProfileView:
    def handle_request(self, request: HttpRequest) -> HttpResponse:
        user = request.user
        collections = user.collections.all()

        current_collection = user.current_collection
        if current_collection:
            current_collection_id = current_collection.id
        else:
            current_collection_id = collections[0].id

        return render(request, 'profile/module.html',
                      {'username': user.username,
                       'first_name': user.first_name,
                       'last_name': user.last_name,
                       'email': user.email,
                       'current_collection_id': current_collection_id,
                       'collections': [(collection.id, collection.title) for collection in collections]
                       })

    def change_collection(self, request: HttpRequest, collection_id: int) -> HttpResponse:
        collection = get_object_or_404(Collection, id=collection_id, accounts=request.user)
        request.user.current_collection = collection
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
