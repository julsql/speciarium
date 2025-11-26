import django.contrib.auth.models
import django.contrib.auth.validators
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


def create_collection(apps, schema_editor):
    collection_table = apps.get_model('main', 'Collection')
    collection_table.objects.get_or_create(title="Une Collection")


def insert_themes(apps, schema_editor):
    theme_table = apps.get_model('main', 'Theme')
    theme_table.objects.get_or_create(name="modern", defaults={"description": "Thème moderne"})
    theme_table.objects.get_or_create(name="old", defaults={"description": "Thème encyclopédique"})


def insert_map_tiles(apps, schema_editor):
    map_tiles_table = apps.get_model('main', 'MapTiles')
    map_tiles_table.objects.get_or_create(name="default",
                                   defaults={"description": "Carte par défaut",
                                             "server": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"})
    map_tiles_table.objects.get_or_create(name="fr",
                                   defaults={"description": "Carte en français",
                                             "server": "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"})


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        # Création des modèles principaux
        migrations.CreateModel(
            name='Species',
            fields=[
                ('id', models.BigAutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('latin_name', models.CharField(max_length=255, unique=True, verbose_name='Nom latin')),
                ('genus', models.CharField(max_length=255, verbose_name='Genre')),
                ('species', models.CharField(max_length=255, verbose_name='Espèce')),
                ('french_name', models.CharField(blank=True, max_length=255, verbose_name='Nom français')),
                ('kingdom', models.CharField(blank=True, max_length=255, verbose_name='Règne')),
                ('class_field', models.CharField(blank=True, max_length=255, verbose_name='Classe')),
                ('order_field', models.CharField(blank=True, max_length=255, verbose_name='Ordre')),
                ('family', models.CharField(blank=True, max_length=255, verbose_name='Famille')),
            ],
        ),
        migrations.CreateModel(
            name='MapTiles',
            fields=[
                ('id', models.BigAutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('description', models.CharField(max_length=500)),
                ('server', models.URLField()),
            ],
        ),
        migrations.CreateModel(
            name='Theme',
            fields=[
                ('id', models.BigAutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('description', models.CharField(max_length=500)),
            ],
        ),
        migrations.CreateModel(
            name='Collection',
            fields=[
                ('id', models.BigAutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='Photos',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.IntegerField(blank=True, null=True, verbose_name='Année')),
                ('date', models.DateField(blank=True, null=True, verbose_name='Date')),
                ('latitude', models.FloatField(blank=True, null=True, verbose_name='Latitude')),
                ('longitude', models.FloatField(blank=True, null=True, verbose_name='Longitude')),
                ('continent', models.CharField(blank=True, max_length=255, verbose_name='Continent')),
                ('country', models.CharField(max_length=255, verbose_name='Pays')),
                ('region', models.CharField(blank=True, max_length=255, verbose_name='Région')),
                ('photo', models.CharField(max_length=255, verbose_name='Photo')),
                ('thumbnail', models.CharField(max_length=255, verbose_name='Vignette')),
                ('hash', models.CharField(max_length=255, verbose_name='Hash')),
                ('details', models.TextField(blank=True, verbose_name='Détails')),
                ('specie', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='main.species')),
                ('collection',
                 models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='rows',
                                   to='main.collection')),
            ],
        ),
        migrations.CreateModel(
            name='AppUser',
            fields=[
                ('id', models.BigAutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, verbose_name='superuser status')),
                ('username', models.CharField(max_length=150, unique=True,
                                              validators=[django.contrib.auth.validators.UnicodeUsernameValidator()],
                                              verbose_name='username')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('is_staff', models.BooleanField(default=False, verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('map_tiles', models.ForeignKey(blank=True, null=True,
                                                on_delete=models.PROTECT, related_name='users', to='main.MapTiles')),
                ('theme', models.ForeignKey(blank=True, null=True,
                                            on_delete=models.PROTECT, related_name='users', to='main.Theme')),
                ('current_collection', models.ForeignKey(blank=True, null=True, on_delete=models.PROTECT,
                                                         related_name='current_users', to='main.Collection')),
                ('groups', models.ManyToManyField(blank=True, to='auth.Group', related_name='user_set',
                                                  related_query_name='user')),
                ('user_permissions', models.ManyToManyField(blank=True, to='auth.Permission', related_name='user_set',
                                                            related_query_name='user')),
            ],
            options={
                'verbose_name': 'user',
                'verbose_name_plural': 'users',
            },
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.AddField(
            model_name='collection',
            name='owner',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='collections_owned', to=settings.AUTH_USER_MODEL),
        ),

        migrations.AddField(
            model_name='collection',
            name='accounts',
            field=models.ManyToManyField(related_name='collections', to=settings.AUTH_USER_MODEL),
        ),
        # Insertions initiales
        migrations.RunPython(insert_map_tiles),
        migrations.RunPython(create_collection),
        migrations.RunPython(insert_themes),
    ]
