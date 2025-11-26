from django.db import models

class Species(models.Model):
    latin_name = models.CharField(max_length=255, verbose_name="Nom latin", unique=True)
    genus = models.CharField(max_length=255, verbose_name="Genre")
    species = models.CharField(max_length=255, verbose_name="Espèce")
    french_name = models.CharField(max_length=255, verbose_name="Nom français", blank=True)
    kingdom = models.CharField(max_length=255, verbose_name="Règne", blank=True)
    class_field = models.CharField(max_length=255, verbose_name="Classe", blank=True)
    order_field = models.CharField(max_length=255, verbose_name="Ordre", blank=True)
    family = models.CharField(max_length=255, verbose_name="Famille", blank=True)

    def __str__(self):
        return self.latin_name

