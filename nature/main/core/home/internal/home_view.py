from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpRequest
from django.shortcuts import render

from main.core.advanced_search.internal.advanced_search_view import advanced_search
from main.core.advanced_search_result.internal.advanced_search_result_view import advanced_search_result


@login_required
def home(request: HttpRequest) -> HttpResponse:
    form, continents, years, countries, regions = advanced_search(request)
    value = {'form': form,
             'continents': continents,
             'years': years,
             'countries': countries,
             'regions': regions}

    table, total_results = advanced_search_result(request, form)
    value.update({'table': table, 'total_results': total_results})

    return render(request, 'home/module.html', value)
