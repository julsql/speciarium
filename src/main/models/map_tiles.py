from django.db import models


class MapTiles(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=500)
    server = models.URLField()

    def __str__(self):
        return self.name
