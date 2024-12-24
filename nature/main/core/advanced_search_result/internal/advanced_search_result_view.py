from django_tables2 import RequestConfig
from main.core.advanced_search_result.internal.table import SpeciesTable
from main.models.species import Species

def advanced_search_result(request, form):
        queryset = Species.objects.all()

        if form.is_valid():
                # Mapping of form field names to model field names
                filter_mappings = {
                        'latin_name': 'latin_name__icontains',
                        'genus': 'genus__icontains',
                        'species': 'species__icontains',
                        'french_name': 'french_name__icontains',
                        'class_field': 'class_field__icontains',
                        'order': 'order__icontains',
                        'family': 'family__icontains',
                        'year': 'year__icontains',
                        'day': 'day__icontains',
                        'continent': 'continent__icontains',
                        'country': 'country__icontains',
                        'region': 'region__icontains',
                        'title': 'title__icontains',
                        'note': 'note__icontains',
                }

                # Dynamically filter the queryset based on form data
                for form_field, model_field in filter_mappings.items():
                        value = form.cleaned_data.get(form_field)
                        if value:
                                queryset = queryset.filter(**{model_field: value})

        table = SpeciesTable(queryset)
        RequestConfig(request, paginate={"per_page": 10}).configure(table)
        return table
