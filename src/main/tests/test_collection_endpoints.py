from django.contrib.auth import get_user_model
from django.test import TestCase

from main.models.collection import Collection
from main.models.map_tiles import MapTiles
from main.models.theme import Theme


class CollectionEndpointsOwnershipTests(TestCase):
    ENDPOINTS = ("/hash/{id}/", "/clean/{id}/", "/upload-images/{id}/")

    def setUp(self):
        MapTiles.objects.get_or_create(
            name="default", defaults={"description": "d", "server": "https://tiles.example.com"}
        )
        Theme.objects.get_or_create(
            name="default", defaults={"description": "d", "sheet": "main-old"}
        )
        User = get_user_model()
        self.collection = Collection.objects.create(title="Collection d'alice")
        self.owner = User.objects.create_user(
            username="alice", email="alice@example.com", password="pwd-123456",
            current_collection=self.collection,
        )
        self.collection.owner = self.owner
        self.collection.save()
        self.intruder = User.objects.create_user(
            username="mallory", email="mallory@example.com", password="pwd-123456"
        )

    def _urls(self):
        return [url.format(id=self.collection.id) for url in self.ENDPOINTS]

    def test_anonymous_is_rejected(self):
        for url in self._urls():
            self.assertEqual(self.client.get(url).status_code, 401, url)
            self.assertEqual(self.client.post(url).status_code, 401, url)

    def test_non_owner_is_forbidden(self):
        self.client.force_login(self.intruder)
        for url in self._urls():
            self.assertEqual(self.client.get(url).status_code, 403, url)

    def test_owner_can_read_hashes(self):
        self.client.force_login(self.owner)
        response = self.client.get(f"/hash/{self.collection.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"keys": []})
