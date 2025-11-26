from main.core.frontend.advanced_search.internal.forms import SpeciesSearchForm


def advanced_search(request):
    user = request.user
    collections = user.collections.all()
    current_collection = user.current_collection
    if current_collection:
        current_collection_id = current_collection.id
    else:
        current_collection_id = collections[0].id
    form = SpeciesSearchForm(request.GET or None, current_collection_id)
    continents = form.continents
    years = form.years
    countries = form.countries
    regions = form.regions
    kingdoms = form.kingdoms
    classes = form.classes
    orders = form.orders
    return form, continents, years, countries, regions, kingdoms, classes, orders
