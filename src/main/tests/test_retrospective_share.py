import base64

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

from main.models.collection import Collection
from main.models.map_tiles import MapTiles
from main.models.theme import Theme

STATIC_STORAGE = {
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}
}


@override_settings(SITE_URL="https://speciarium.julsql.fr", STORAGES=STATIC_STORAGE)
class RetrospectiveShareTokenTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        MapTiles.objects.get_or_create(
            name="default", defaults={"description": "d", "server": "https://tiles.example.com"}
        )
        Theme.objects.get_or_create(name="default", defaults={"description": "d", "sheet": "main-old"})
        collection = Collection.objects.create(title="Collection d'alice")
        cls.user = get_user_model().objects.create_user(
            username="alice", email="alice@example.com", password="pwd-123456",
            current_collection=collection,
        )
        collection.owner = cls.user
        collection.save()
        collection.accounts.add(cls.user)

    def shared_url(self, token):
        return reverse("retrospective_shared", args=[token])

    def test_token_is_random_and_unique_per_user(self):
        other = get_user_model().objects.create_user(
            username="bob", email="bob@example.com", password="pwd-123456"
        )
        token = self.user.retrospective_share_token
        self.assertGreaterEqual(len(token), 43)
        self.assertNotEqual(token, other.retrospective_share_token)
        self.assertNotIn("alice", token)

    def test_valid_token_returns_200_with_noindex(self):
        response = self.client.get(self.shared_url(self.user.retrospective_share_token))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "alice")
        self.assertContains(response, '<meta name="robots" content="noindex, nofollow">')
        self.assertEqual(response["X-Robots-Tag"], "noindex, nofollow")

    def test_valid_token_without_trailing_slash_returns_200(self):
        url = f"/profile/retrospective/{self.user.retrospective_share_token}"
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_unknown_token_returns_404(self):
        self.assertEqual(self.client.get(self.shared_url("not-a-real-token")).status_code, 404)

    def test_legacy_base64_username_link_returns_404_without_redirect(self):
        legacy = base64.b64encode(b"alice").decode()
        for url in (f"/profile/retrospective/{legacy}", f"/profile/retrospective/{legacy}/"):
            response = self.client.get(url)
            self.assertEqual(response.status_code, 404, url)
            self.assertNotIn("Location", response)
            self.assertNotIn(self.user.retrospective_share_token, response.content.decode())

    def test_regeneration_revokes_old_token(self):
        old_token = self.user.retrospective_share_token
        self.client.force_login(self.user)
        response = self.client.post(reverse("retrospective_regenerate"))
        self.assertRedirects(response, reverse("retrospective"), fetch_redirect_response=False)
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.retrospective_share_token, old_token)
        self.client.logout()
        self.assertEqual(self.client.get(self.shared_url(old_token)).status_code, 404)
        self.assertEqual(
            self.client.get(self.shared_url(self.user.retrospective_share_token)).status_code, 200
        )

    def test_regeneration_requires_login_and_post(self):
        old_token = self.user.retrospective_share_token
        response = self.client.post(reverse("retrospective_regenerate"))
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response["Location"].startswith(reverse("login")))
        self.client.force_login(self.user)
        self.assertEqual(self.client.get(reverse("retrospective_regenerate")).status_code, 405)
        self.user.refresh_from_db()
        self.assertEqual(self.user.retrospective_share_token, old_token)

    def test_owner_page_exposes_share_link(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("retrospective"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.shared_url(self.user.retrospective_share_token))
        self.assertNotContains(response, "btoa(")

    def test_token_absent_from_public_pages(self):
        token = self.user.retrospective_share_token
        for url in ("/", reverse("login"), reverse("signup"), "/robots.txt", "/sitemap.xml"):
            response = self.client.get(url)
            self.assertNotIn(token, response.content.decode(), url)
        # La page partagée n'embarque pas le token dans son HTML (bouton de partage inclus).
        shared = self.client.get(self.shared_url(token))
        self.assertNotIn(token, shared.content.decode())
        self.assertNotContains(shared, reverse("retrospective_regenerate"))

    def test_robots_txt_keeps_profile_exclusion(self):
        self.assertIn("Disallow: /profile", self.client.get("/robots.txt").content.decode())
