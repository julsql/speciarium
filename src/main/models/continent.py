from django.db import models


class Continent(models.Model):
    code = models.CharField(max_length=3, verbose_name="Code")
    name = models.CharField(max_length=255, verbose_name="Continent")

    def __str__(self):
        return self.name
