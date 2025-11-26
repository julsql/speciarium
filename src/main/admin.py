from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html

from main.models import AppUser
from main.models.collection import Collection
from main.models.map_tiles import MapTiles
from main.models.photo import Photos
from main.models.species import Species


@admin.register(Photos)
class PhotosAdmin(admin.ModelAdmin):
    list_display = (
        'year', 'date', 'latitude', 'longitude', 'continent', 'country',
        'region', 'specie__latin_name', 'collection_link', 'photo_preview', 'thumbnail_preview',
        'hash', 'details'
    )
    search_fields = ('year', 'date', 'latitude', 'longitude', 'continent',
                     'country', 'region', 'specie__latin_name')
    list_filter = ('date', 'specie__latin_name', 'collection__title')
    list_select_related = ('collection',)
    readonly_fields = ('photo_preview', 'thumbnail_preview')

    def photo_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:80px;"/>', obj.photo)
        return "-"
    photo_preview.short_description = "Aperçu photo"

    def thumbnail_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:80px;"/>', obj.thumbnail)
        return "-"
    thumbnail_preview.short_description = "Aperçu vignette"

    def collection_link(self, obj):
        return format_html('<a href="/admin/main/collection/{}/change/">{}</a>', obj.collection.id,
                           obj.collection.title)

    collection_link.short_description = "Collection"


@admin.register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    list_display = (
        'latin_name', 'genus', 'species', 'french_name', 'kingdom', 'class_field',
        'order_field', 'family'
    )
    search_fields = ('latin_name', 'genus', 'species', 'french_name', 'kingdom', 'class_field',
                     'order_field', 'family')


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'owner', 'account_count')
    search_fields = ('title', 'owner')
    filter_horizontal = ('accounts',)
    list_select_related = ('owner',)

    def account_count(self, obj):
        return obj.accounts.count()

    account_count.short_description = "Utilisateurs liés"


@admin.register(MapTiles)
class MapTilesAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'server')
    search_fields = ('name', 'description', 'server')


@admin.register(AppUser)
class AppUserAdmin(UserAdmin):
    model = AppUser
    list_display = ('username', 'email', 'is_staff', 'current_collection')
    search_fields = ('username', 'email')
    list_filter = ('is_staff', 'is_superuser', 'current_collection')
    fieldsets = (
        ("Infos de connexion", {"fields": ("username", "password")}),
        ("Infos personnelles", {"fields": ("first_name", "last_name", "email")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Relations", {"fields": ("current_collection",)}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
