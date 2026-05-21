from django.contrib import admin
from django.test import TestCase, Client, override_settings
from django.urls import reverse

from main.models import AppUser
from main.models.theme import Theme


class AdminBrandingTests(TestCase):
    def test_site_header_is_speciarium(self):
        self.assertEqual(admin.site.site_header, "Speciarium · Administration")

    def test_site_title_is_speciarium(self):
        self.assertEqual(admin.site.site_title, "Speciarium Admin")

    def test_index_title_is_dashboard(self):
        self.assertEqual(admin.site.index_title, "Tableau de bord")


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
class AdminThemeTemplateTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.modern_theme, _ = Theme.objects.get_or_create(
            name="modern", defaults={"description": "Thème moderne", "sheet": "main-modern"}
        )
        self.old_theme, _ = Theme.objects.get_or_create(
            name="default", defaults={"description": "Thème encyclopédique", "sheet": "main-old"}
        )

    def test_anonymous_login_page_uses_old_stylesheet(self):
        response = self.client.get(reverse("admin:login"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "admin/css/admin-old.css")
        self.assertNotContains(response, "admin/css/admin-modern.css")

    def test_anonymous_login_page_shows_branding(self):
        response = self.client.get(reverse("admin:login"))
        self.assertContains(response, "speciarium-brand")
        self.assertContains(response, "main/images/papillon.png")

    def test_modern_user_sees_modern_stylesheet(self):
        user = AppUser.objects.create_superuser(
            username="modernadmin",
            email="modern@example.com",
            password="pw",
            theme=self.modern_theme,
        )
        self.client.force_login(user)
        response = self.client.get(reverse("admin:index"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "admin/css/admin-modern.css")
        self.assertNotContains(response, "admin/css/admin-old.css")

    def test_old_user_sees_old_stylesheet(self):
        user = AppUser.objects.create_superuser(
            username="oldadmin",
            email="old@example.com",
            password="pw",
            theme=self.old_theme,
        )
        self.client.force_login(user)
        response = self.client.get(reverse("admin:index"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "admin/css/admin-old.css")
        self.assertNotContains(response, "admin/css/admin-modern.css")

    def test_admin_index_shows_back_to_site_link(self):
        user = AppUser.objects.create_superuser(
            username="anyadmin",
            email="any@example.com",
            password="pw",
            theme=self.old_theme,
        )
        self.client.force_login(user)
        response = self.client.get(reverse("admin:index"))
        self.assertContains(response, "speciarium-back")
