from main.core.frontend.advanced_search.internal.forms import SpeciesSearchForm


def advanced_search(request):
    form = SpeciesSearchForm(request.GET or None)
    continents = form.continents
    years = form.years
    countries = form.countries
    regions = form.regions
    return form, continents, years, countries, regions
