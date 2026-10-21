import json
import re

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
class LandingPageTests(TestCase):
    def test_anonymous_home_renders_public_landing(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "home/landing.html")
        self.assertContains(response, reverse("login"))
        self.assertContains(response, reverse("signup"))
        self.assertContains(response, reverse("demo_login"))

    def test_landing_has_seo_tags(self):
        html = self.client.get("/").content.decode()
        self.assertIn('<html lang="fr">', html)
        self.assertIn(
            "<title>Speciarium – Votre encyclopédie personnelle des espèces</title>", html
        )
        self.assertIn('<meta name="description" content="Speciarium catalogue', html)
        self.assertIn('<link rel="canonical" href="https://speciarium.julsql.fr/">', html)
        for prop in ("og:title", "og:description", "og:url", "og:type", "og:locale"):
            self.assertIn(f'property="{prop}"', html)
        self.assertIn(
            '<meta property="og:image" content="https://speciarium.julsql.fr/static/main/images/og-image.jpg">',
            html,
        )
        self.assertIn('name="twitter:card" content="summary_large_image"', html)
        self.assertIn('rel="apple-touch-icon"', html)
        self.assertIn('name="theme-color"', html)
        self.assertNotIn("noindex", html)
        self.assertNotIn("leaflet.css", html)

    def test_landing_has_valid_json_ld(self):
        html = self.client.get("/").content.decode()
        match = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
        self.assertIsNotNone(match)
        types = {node["@type"] for node in json.loads(match.group(1))["@graph"]}
        self.assertEqual(types, {"WebSite", "WebApplication"})

    def test_landing_has_single_h1(self):
        html = self.client.get("/").content.decode()
        self.assertEqual(html.count("<h1"), 1)

    def test_images_have_alt_and_dimensions(self):
        html = self.client.get("/").content.decode()
        for img in re.findall(r"<img\b[^>]*>", html):
            self.assertIn("alt=", img)
            self.assertIn("width=", img)
            self.assertIn("height=", img)

    def test_public_pages_have_unique_titles_and_descriptions(self):
        titles, descriptions = set(), set()
        for url in ("/", reverse("login"), reverse("signup")):
            html = self.client.get(url).content.decode()
            title = re.search(r"<title>(.*?)</title>", html).group(1)
            description = re.search(r'<meta name="description" content="(.*?)">', html).group(1)
            self.assertTrue(50 <= len(title) <= 60, (url, len(title)))
            self.assertTrue(140 <= len(description) <= 160, (url, len(description)))
            self.assertEqual(html.count("<h1"), 1, url)
            titles.add(title)
            descriptions.add(description)
        self.assertEqual(len(titles), 3)
        self.assertEqual(len(descriptions), 3)


@override_settings(STORAGES=STATIC_STORAGE)
class AuthenticatedHomeTests(TestCase):
    def test_authenticated_home_keeps_dashboard(self):
        MapTiles.objects.get_or_create(
            name="default", defaults={"description": "d", "server": "https://tiles.example.com"}
        )
        Theme.objects.get_or_create(
            name="default", defaults={"description": "d", "sheet": "main-old"}
        )
        collection = Collection.objects.create(title="Collection de bob")
        user = get_user_model().objects.create_user(
            username="bob", email="bob@example.com", password="pwd-123456",
            current_collection=collection,
        )
        collection.owner = user
        collection.accounts.add(user)
        collection.save()
        self.client.force_login(user)

        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "home/module.html")
        self.assertTemplateNotUsed(response, "home/landing.html")
        self.assertNotContains(response, 'rel="canonical"')


class PrivateViewsStayProtectedTests(TestCase):
    PRIVATE_URLS = (
        "/profile",
        "/carte/",
        "/photos/",
        "/profile/retrospective/",
        "/api/filtered-options/",
        "/create_collection/",
        "/delete_account/",
    )

    def test_private_views_redirect_anonymous_to_login(self):
        for url in self.PRIVATE_URLS:
            response = self.client.get(url)
            self.assertIn(response.status_code, (302, 403, 405), url)
            if response.status_code == 302:
                self.assertTrue(response["Location"].startswith(reverse("login")), url)

    def test_admin_requires_login(self):
        response = self.client.get("/admin/")
        self.assertEqual(response.status_code, 302)


@override_settings(SITE_URL="https://speciarium.julsql.fr")
class RobotsAndSitemapTests(TestCase):
    def test_robots_txt(self):
        response = self.client.get("/robots.txt")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/plain; charset=utf-8")
        body = response.content.decode()
        self.assertIn("User-agent: *\nAllow: /\n", body)
        for rule in ("Disallow: /admin/", "Disallow: /accounts/", "Allow: /accounts/login/",
                     "Disallow: /api/", "Disallow: /profile"):
            self.assertIn(rule, body)
        self.assertIn("Sitemap: https://speciarium.julsql.fr/sitemap.xml", body)

    def test_sitemap_xml(self):
        response = self.client.get("/sitemap.xml")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/xml; charset=utf-8")
        body = response.content.decode()
        self.assertTrue(body.startswith('<?xml version="1.0" encoding="UTF-8"?>'))
        for loc in ("https://speciarium.julsql.fr/",
                    "https://speciarium.julsql.fr/accounts/login/",
                    "https://speciarium.julsql.fr/accounts/signup/"):
            self.assertIn(f"<loc>{loc}</loc>", body)
        self.assertNotIn("/admin/", body)
