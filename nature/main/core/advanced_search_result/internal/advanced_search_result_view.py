from django_tables2 import RequestConfig

from main.core.advanced_search_result.internal.table import SpeciesTable
from main.models.species import Species


def advanced_search_result(request, form):

        queryset = Species.objects.all()

        # Filtrer en fonction des critères du formulaire
        if form.is_valid():
                if form.cleaned_data.get('name'):
                        queryset = queryset.filter(name__icontains=form.cleaned_data['name'])
                if form.cleaned_data.get('category'):
                        queryset = queryset.filter(category__icontains=form.cleaned_data['category'])
                if form.cleaned_data.get('min_price') is not None:
                        queryset = queryset.filter(price__gte=form.cleaned_data['min_price'])
                if form.cleaned_data.get('max_price') is not None:
                        queryset = queryset.filter(price__lte=form.cleaned_data['max_price'])
                if form.cleaned_data.get('min_stock') is not None:
                        queryset = queryset.filter(stock__gte=form.cleaned_data['min_stock'])
                if form.cleaned_data.get('max_stock') is not None:
                        queryset = queryset.filter(stock__lte=form.cleaned_data['max_stock'])
        table = SpeciesTable(queryset)
        RequestConfig(request, paginate={"per_page": 10}).configure(table)
        return table