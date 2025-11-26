from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpRequest
from django.shortcuts import render

from main.core.frontend.advanced_search.internal.advanced_search_view import advanced_search
from main.core.frontend.advanced_search_result.internal.advanced_search_result_view import advanced_search_result
from main.models.map_tiles import MapTiles


@login_required
def home(request: HttpRequest) -> HttpResponse:
    if request.user.map_tiles:
        map_server = request.user.map_tiles.server
    else:
        map_server = MapTiles.objects.all().first().server

    form, continents, years, countries, regions, kingdoms, classes, orders = advanced_search(request)
    value = {'form': form,
             'continents': continents,
             'years': years,
             'countries': countries,
             'regions': regions,
             'kingdoms': kingdoms,
             'classes': classes,
             'orders': orders}

    table, total_results = advanced_search_result(request, form)
    value.update({'table': table, 'total_results': total_results, 'page': "tab", 'map_server': map_server})

    return render(request, 'home/module.html', value)
