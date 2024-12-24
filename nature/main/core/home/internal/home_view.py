from django.http import HttpResponse, HttpRequest
from django.shortcuts import render

from main.core.advanced_search.internal.advanced_search_view import advanced_search
from main.core.advanced_search_result.internal.advanced_search_result_view import advanced_search_result


def home(request: HttpRequest) -> HttpResponse:
    form = advanced_search(request)
    table, total_results = advanced_search_result(request, form)
    value = {'form': form, 'table': table, 'total_results': total_results}
    return render(request, 'home/module.html', value)
