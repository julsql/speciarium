from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.db.models import Q

from main.models.photo import Photos
from main.models.species import Species


@login_required
def get_filtered_options(request):
    """
    Retourne les options filtrées pour un champ donné
    """
    user = request.user
    collection = user.current_collection or user.collections.all().first()

    field = request.GET.get('field')

    # Récupérer les filtres actuels appliqués
    continent = request.GET.get('continent', '')
    country = request.GET.get('country', '')
    region = request.GET.get('region', '')
    year = request.GET.get('year', '')
    kingdom = request.GET.get('kingdom', '')
    class_field = request.GET.get('class_field', '')
    order_field = request.GET.get('order_field', '')

    # Construire la query de base
    queryset = Photos.objects.filter(collection=collection)
    specie_queryset = Species.objects.filter(
        id__in=Photos.objects.filter(collection=collection).values_list('specie_id', flat=True)
    )

    # Appliquer les filtres existants
    if continent:
        queryset = queryset.filter(continent=continent)
    if country:
        queryset = queryset.filter(country=country)
    if region:
        queryset = queryset.filter(region=region)
    if year:
        queryset = queryset.filter(year=year)

    # Pour les filtres d'espèces, il faut aussi filtrer la specie_queryset
    if kingdom:
        specie_queryset = specie_queryset.filter(kingdom=kingdom)
    if class_field:
        specie_queryset = specie_queryset.filter(class_field=class_field)
    if order_field:
        specie_queryset = specie_queryset.filter(order_field=order_field)

    # Mettre à jour la queryset des photos si des filtres d'espèces sont appliqués
    if kingdom or class_field or order_field:
        queryset = queryset.filter(specie_id__in=specie_queryset.values_list('id', flat=True))

    # Récupérer les options pour le champ demandé
    options = []

    if field == 'continent':
        options = list(
            queryset.values_list('continent', flat=True)
            .distinct()
            .order_by('continent')
        )
    elif field == 'country':
        options = list(
            queryset.values_list('country', flat=True)
            .distinct()
            .order_by('country')
        )
    elif field == 'region':
        options = list(
            queryset.values_list('region', flat=True)
            .distinct()
            .order_by('region')
        )
    elif field == 'year':
        options = list(
            queryset.values_list('year', flat=True)
            .distinct()
            .order_by('year')
        )
    elif field == 'kingdom':
        options = list(
            specie_queryset.values_list('kingdom', flat=True)
            .distinct()
            .order_by('kingdom')
        )
    elif field == 'class_field':
        options = list(
            specie_queryset.values_list('class_field', flat=True)
            .distinct()
            .order_by('class_field')
        )
    elif field == 'order_field':
        options = list(
            specie_queryset.values_list('order_field', flat=True)
            .distinct()
            .order_by('order_field')
        )

    # Filtrer les valeurs vides
    options = [str(opt) for opt in options if opt is not None and opt != '']

    return JsonResponse({'options': options})