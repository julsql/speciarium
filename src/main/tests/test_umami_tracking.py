from django.test import TestCase, override_settings
from django.urls import reverse

UMAMI_SRC = "https://stats.julsql.fr/js/app.js"
UMAMI_ID = 'data-website-id="36bb1a86-b212-448e-88f8-26ef6e40ed11"'


@override_settings(STATICFILES_STORAGE="django.contrib.staticfiles.storage.StaticFilesStorage")
class UmamiTrackingTests(TestCase):
    def test_public_login_page_includes_umami(self):
        response = self.client.get(reverse("login"))
        self.assertContains(response, UMAMI_SRC)
        self.assertContains(response, UMAMI_ID)

    def test_admin_login_page_includes_umami(self):
        response = self.client.get(reverse("admin:login"))
        self.assertContains(response, UMAMI_SRC)
        self.assertContains(response, UMAMI_ID)
