import json
import base64
import os
import shutil

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import logout, update_session_auth_hash, get_user_model
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import AnonymousUser
from django.db import transaction
from django.db.models import Case, When, IntegerField, Exists, OuterRef, Count, F, Value
from django.db.models.functions import Coalesce, NullIf, ExtractMonth
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_POST, require_http_methods

from main.core.frontend.profile.forms import EmailUpdateForm, CustomPasswordChangeForm, UsernameUpdateForm, User
from main.core.permissions import deny_demo_user
from main.models import AppUser
from main.models.collection import Collection
from main.models.collection_accounts import CollectionAccounts
from main.models.map_tiles import MapTiles
from main.models.photo import Photos
from main.models.theme import Theme
from main.models.upload_action import UploadAction

from datetime import datetime, timedelta


@login_required
def get_year_retrospective(request: HttpRequest, ) -> HttpResponse:
    user = request.user
    return get_year_retrospective_user(request, user, "PROFILE")

def get_year_retrospective_username(request: HttpRequest, username_64: str) -> HttpResponse:
    base64_bytes = username_64.encode("ascii")
    sample_string_bytes = base64.b64decode(base64_bytes)
    username = sample_string_bytes.decode("ascii")

    user = get_object_or_404(AppUser, username=username)
    return get_year_retrospective_user(request, user, "LINK")

def get_year_retrospective_user(request: HttpRequest, user: AppUser | AbstractBaseUser | AnonymousUser, origin: str) -> HttpResponse:
    """Récupère les stats de l'année pour la rétrospective"""
    # ----- Période de la rétrospective -----
    # Ajuster ces deux valeurs pour cibler une fenêtre différente.
    # Par défaut : du 1er janvier au 31 décembre de l'année courante.
    today = datetime.now()
    start_date = datetime(today.year, 1, 1)
    end_date = datetime(today.year, 12, 31, 23, 59, 59)
    # ----------------------------------------

    # Photos créées dans la période (basé sur l'upload_action d'origine, donc
    # on ignore les renames de photos plus anciennes — Photos.upload_action_id
    # pointe toujours vers l'upload qui a introduit le contenu pour la
    # première fois).
    photos_this_year = Photos.objects.filter(
        collection__owner=user,
        upload_action__created_at__gte=start_date,
        upload_action__created_at__lte=end_date,
    )

    total_photos = photos_this_year.count()

    # Lieux les plus visités
    top_locations = photos_this_year.values('country', 'region').annotate(
        count=Count('id'),
        location_name=Coalesce(
            NullIf(F('region'), Value('')),
            NullIf(F('country'), Value('')),
            Value('Non spécifié')
        )
    ).order_by('-count')[:5]

    # Classes les plus photographiées
    top_classes = (
        photos_this_year
        .exclude(specie__class_field='')
        .values('specie__class_field')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )

    # La "paire parfaite" : parmi les utilisateurs qui ont accès aux
    # collections visibles, on cherche celui dont l'activité (taxonomie
    # + lieux) recoupe le plus la nôtre. Plus le niveau taxonomique est
    # spécifique, plus il pèse dans le score (espèce > genre > famille >
    # ordre > classe > règne). Idem pour les lieux (région > pays >
    # continent). Le volume de photos n'entre pas dans le score.
    visible_collections_ids = list(user.collections.values_list('id', flat=True))

    visible_photos_qs = Photos.objects.filter(
        collection_id__in=visible_collections_ids,
        upload_action__created_at__gte=start_date,
        upload_action__created_at__lte=end_date,
    )

    similarity_weights = [
        ('specie_id', 6),
        ('specie__genus', 5),
        ('specie__family', 4),
        ('specie__order_field', 3),
        ('specie__class_field', 2),
        ('specie__kingdom', 1),
        ('region', 3),
        ('country', 2),
        ('continent', 1),
    ]
    profile_fields = [field for field, _ in similarity_weights]

    def _profile_sets(rows):
        sets = {f: set() for f in profile_fields}
        for row in rows:
            for f in profile_fields:
                v = row[f]
                if v not in (None, ''):
                    sets[f].add(v)
        return sets

    user_rows = list(
        visible_photos_qs.filter(upload_action__user=user).values(*profile_fields)
    )
    user_sets = _profile_sets(user_rows)

    candidate_users = AppUser.objects.filter(
        collections__id__in=visible_collections_ids
    ).exclude(pk=user.pk).distinct()

    common_species_stats = []
    for candidate in candidate_users:
        cand_rows = list(
            visible_photos_qs.filter(upload_action__user=candidate).values(*profile_fields)
        )
        if not cand_rows:
            continue
        cand_sets = _profile_sets(cand_rows)

        score = 0.0
        for field, weight in similarity_weights:
            a, b = user_sets[field], cand_sets[field]
            union = a | b
            if not union:
                continue
            score += weight * len(a & b) / len(union)

        if score == 0:
            continue

        common_species_stats.append({
            'username': candidate.username,
            'common_species_count': len(user_sets['specie_id'] & cand_sets['specie_id']),
            'common_countries_count': len(user_sets['country'] & cand_sets['country']),
            'score': score,
            'user_id': candidate.id,
        })

    common_species_stats.sort(key=lambda x: x['score'], reverse=True)
    top_common_user = common_species_stats[0] if common_species_stats else None

    # Stats supplémentaires
    photos_per_month = (
        photos_this_year
        .annotate(month=ExtractMonth('upload_action__created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    # Photo la mieux accueillie (adapter selon votre modèle)
    best_photo = photos_this_year.annotate(
        interaction_count=Count('id')
    ).order_by('-upload_action__created_at').first()

    # Streaks
    photo_dates = set(
        photos_this_year.values_list('upload_action__created_at__date', flat=True).distinct()
    )
    current_streak = _calculate_streak(photo_dates)
    longest_streak = _calculate_longest_streak(photo_dates)

    # Calcul du max mensuel pour le graphique
    max_monthly = max([m['count'] for m in photos_per_month]) if photos_per_month else 1

    return render(request, 'profile/retrospective.html', {
        'username': user.username,
        'year': start_date.year,
        'start_date': start_date,
        'end_date': end_date,
        'total_photos': total_photos,
        'top_locations': top_locations,
        'top_classes': top_classes,
        'top_common_user': top_common_user,
        'photos_per_month': photos_per_month,
        'best_photo': best_photo,
        'current_streak': current_streak,
        'longest_streak': longest_streak,
        'all_common_users': common_species_stats[:10],
        'max_monthly_count': max_monthly,
        'origin': origin,
    })


def _calculate_streak(dates_set):
    """Calcule le streak actuel"""
    if not dates_set:
        return 0

    sorted_dates = sorted(dates_set, reverse=True)
    today = datetime.now().date()
    streak = 0
    current_date = today

    for date in sorted_dates:
        if (current_date - date).days == 0 or (current_date - date).days == 1:
            streak += 1
            current_date -= timedelta(days=1)
        else:
            break

    return streak


def _calculate_longest_streak(dates_set):
    """Calcule le plus long streak de l'année"""
    if not dates_set:
        return 0

    sorted_dates = sorted(dates_set)
    max_streak = 1
    current_streak = 1

    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 1

    return max_streak


class ProfileView:
    def handle_request(self, request: HttpRequest) -> HttpResponse:
        user = request.user
        collections = user.collections.annotate(
            special_order=Case(
                When(owner=user, then=0),  # les collections "spéciales" viennent en premier
                default=1,
                output_field=IntegerField(),
            ),
            has_photos=Exists(
                Photos.objects.filter(collection=OuterRef('pk'))
            )
        ).order_by('special_order', 'created_at')
        all_map_tiles = MapTiles.objects.all()
        all_themes = Theme.objects.all()

        current_collection = user.current_collection
        if current_collection:
            current_collection_id = current_collection.id
            current_collection_title = current_collection.title
        else:
            current_collection_id = collections[0].id if collections else None
            current_collection_title = collections[0].title if collections else None

        if request.user.map_tiles:
            map_server_id = request.user.map_tiles.id
        else:
            map_server_id = all_map_tiles.first().id

        if request.user.theme:
            theme_id = request.user.theme.id
        else:
            theme_id = all_themes.first().id

        username_form = UsernameUpdateForm(initial={'username': user.username})
        email_form = EmailUpdateForm(initial={'email': user.email})
        password_form = CustomPasswordChangeForm(user)

        if request.method == "POST" and not getattr(user, 'is_demo', False):
            if "update_username" in request.POST:
                username_form = UsernameUpdateForm(request.POST, user=request.user)
                if username_form.is_valid():
                    user.username = username_form.cleaned_data["username"]
                    user.save()
                    messages.success(request, "Nom d'utilisateur mis à jour.")
                    return redirect("profile")
            if "update_email" in request.POST:
                email_form = EmailUpdateForm(request.POST, user=request.user)
                if email_form.is_valid():
                    user.email = email_form.cleaned_data['email']
                    user.save()
                    messages.success(request, "Email mis à jour avec succès.")
                    return redirect('profile')
            elif "change_password" in request.POST:
                password_form = CustomPasswordChangeForm(user, request.POST)
                if password_form.is_valid():
                    user = password_form.save()
                    update_session_auth_hash(request, user)  # Important pour garder la session
                    messages.success(request, "Mot de passe mis à jour avec succès.")
                    return redirect('profile')

        upload_history = (
            UploadAction.objects
            .filter(user=user)
            .filter(images_uploaded__gt=0)
            .select_related("collection")
            .order_by("-created_at")
        )

        all_collections = [
            (
                collection.id,
                collection.title,
                collection.owner_id,
                collection.owner.username,
                collection.accounts
                .annotate(
                    is_me=Case(
                        When(collectionaccounts__user=request.user, then=0),
                        default=1,
                        output_field=IntegerField(),
                    )
                )
                .order_by(
                    'is_me',
                    'collectionaccounts__created_at'
                )
                .values_list('username', flat=True),
                collection.accounts
                .exclude(pk=request.user.pk)
                .annotate(
                    is_me=Case(
                        When(collectionaccounts__user=request.user, then=0),
                        default=1,
                        output_field=IntegerField(),
                    )
                )
                .order_by(
                    'is_me',
                    'collectionaccounts__created_at'
                )
                .values_list('username', flat=True),
                collection.has_photos,
            )
            for collection in collections
        ]

        return render(request, 'profile/module.html', {
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'current_collection_id': current_collection_id,
            'current_collection_title': current_collection_title,
            'collections': all_collections,
            'current_map_tiles_id': map_server_id,
            'map_tiles': [(map_tiles.id, map_tiles.description) for map_tiles in all_map_tiles],
            'current_theme_id': theme_id,
            'themes': [(theme.id, theme.description) for theme in all_themes],
            'email_form': email_form,
            'username_form': username_form,
            'password_form': password_form,
            'upload_history': upload_history,
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

    def change_themes(self, request: HttpRequest, theme_id: int) -> HttpResponse:
        theme = get_object_or_404(Theme, id=theme_id)
        request.user.theme = theme
        request.user.save()
        return redirect('profile')

    def update_collection_name(self, request: HttpRequest) -> HttpResponse:
        data = json.loads(request.body)
        collection_id = data.get("collection_id")
        new_title = data.get("new_title")

        try:
            collection = Collection.objects.get(id=collection_id, owner=request.user)
            collection.title = new_title
            collection.save()
            return JsonResponse({"success": True})
        except Collection.DoesNotExist:
            return JsonResponse({"success": False, "error": "Collection non trouvée"})

    def add_user_to_collection(self, request):
        data = json.loads(request.body)
        username = data.get("username")
        collection_id = data.get("collection_id")

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({"success": False, "error": "Utilisateur inexistant"})

        try:
            print(collection_id)
            collection = Collection.objects.get(id=collection_id)
        except Collection.DoesNotExist:
            return JsonResponse({"success": False, "error": "Collection inconnue"})

        # éviter doublon
        if CollectionAccounts.objects.filter(user=user, collection=collection).exists():
            return JsonResponse({"success": False, "error": "Utilisateur déjà ajouté"})

        CollectionAccounts.objects.create(
            user=user,
            collection=collection
        )

        return JsonResponse({"success": True})

    def remove_user_from_collection(self, request):
        data = json.loads(request.body)
        username = data.get("username")
        collection_id = data.get("collection_id")

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({"success": False, "error": "Utilisateur inexistant"})

        CollectionAccounts.objects.filter(
            collection_id=collection_id,
            user=user
        ).delete()

        return JsonResponse({"success": True})

    def create_collection(self, request):
        try:
            data = json.loads(request.body)
            title = data.get('title', '').strip()

            if not title:
                return JsonResponse({'success': False, 'error': 'Le titre est requis.'})

            if Collection.objects.filter(owner=request.user, title=title).exists():
                return JsonResponse({'success': False, 'error': 'Vous avez déjà une collection avec ce titre.'})

            collection = Collection.objects.create(title=title, owner=request.user)
            collection.accounts.add(request.user)

            return JsonResponse({'success': True, 'collection_id': collection.id, 'title': collection.title})

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

    def delete_collection(self, request, collection_id):
        user = request.user

        # Récupérer la collection et s'assurer que l'utilisateur en est le propriétaire
        collection = get_object_or_404(Collection, pk=collection_id, owner=user)

        # Vérifier si la collection contient des photos
        if collection.rows.exists():
            print("Impossible de supprimer : la collection contient des photos.")
            return JsonResponse(
                {"success": False, "error": "Impossible de supprimer : la collection contient des photos."},
                status=400
            )

        # Vérifier s'il existe d'autres collections dont l'utilisateur est propriétaire
        other_collections = Collection.objects.filter(owner=user).exclude(pk=collection.pk)
        if not other_collections.exists():
            print("Impossible de supprimer : c'est votre seule collection.")
            return JsonResponse(
                {"success": False, "error": "Impossible de supprimer : c'est votre seule collection."},
                status=400
            )

        # Tout faire dans une transaction pour sécurité
        with transaction.atomic():

            # Si c'est la collection actuelle de l'utilisateur, changer la current_collection
            if hasattr(user, "current_collection") and user.current_collection_id == collection.id:
                user.current_collection = other_collections.first()
                user.save(update_fields=["current_collection"])

            # Supprimer tous les comptes qui peuvent voir cette collection
            CollectionAccounts.objects.filter(collection=collection).delete()

            # Supprimer la collection
            collection.delete()

        return JsonResponse({"success": True})


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


@login_required
def change_theme_view(request, theme_id):
    view = ProfileView()
    return view.change_themes(request, theme_id)


@login_required
@require_POST
@deny_demo_user
def update_collection_name_view(request):
    view = ProfileView()
    return view.update_collection_name(request)


User = get_user_model()


@require_POST
@login_required
@deny_demo_user
def add_user_to_collection_view(request):
    view = ProfileView()
    return view.add_user_to_collection(request)


@require_POST
@login_required
@deny_demo_user
def remove_user_from_collection_view(request):
    view = ProfileView()
    return view.remove_user_from_collection(request)


@login_required
@require_POST
@deny_demo_user
def create_collection_view(request):
    view = ProfileView()
    return view.create_collection(request)


@login_required
@require_http_methods(["DELETE"])
@deny_demo_user
def delete_collection_view(request, collection_id):
    view = ProfileView()
    return view.delete_collection(request, collection_id)


@login_required
@require_POST
def delete_account_view(request: HttpRequest) -> HttpResponse:
    user = request.user

    if getattr(user, 'is_demo', False):
        messages.error(request, "Action non autorisée pour l'utilisateur témoin.")
        return redirect('profile')

    password = request.POST.get('password', '')
    if not password or not user.check_password(password):
        messages.error(
            request,
            "Mot de passe incorrect. Le compte n'a pas été supprimé.",
            extra_tags='delete_account',
        )
        return redirect('profile')

    owned_collection_ids = list(user.collections_owned.values_list('id', flat=True))

    with transaction.atomic():
        # Détacher les autres utilisateurs dont la current_collection
        # pointe vers une collection à supprimer (FK PROTECT).
        if owned_collection_ids:
            AppUser.objects.filter(
                current_collection_id__in=owned_collection_ids
            ).exclude(pk=user.pk).update(current_collection=None)

        # Détacher également la current_collection de l'utilisateur lui-même.
        AppUser.objects.filter(pk=user.pk).update(current_collection=None)

        # CASCADE depuis l'utilisateur supprime :
        # - les collections qu'il possède (et leurs Photos via CASCADE)
        # - les CollectionAccounts qui le concernent
        # - les UploadAction et UploadSeen qu'il a créés
        user.delete()

    # Nettoyage des médias (best-effort, hors transaction).
    for collection_id in owned_collection_ids:
        media_dir = os.path.join(
            settings.MEDIA_ROOT, 'main', 'images', str(collection_id)
        )
        shutil.rmtree(media_dir, ignore_errors=True)

    logout(request)
    messages.success(request, "Votre compte et toutes ses données ont été supprimés.")
    return redirect('login')
